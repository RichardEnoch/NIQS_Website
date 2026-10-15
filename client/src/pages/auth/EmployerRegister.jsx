import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { NIGERIAN_STATES, SECTORS } from '../../data/jobBoard';

/**
 * Employer registration for the job board. Two short steps: the organisation,
 * then the person and their sign-in. The account starts "pending" and the
 * Secretariat approves it; until then the employer can sign in and draft.
 */
const EMPTY = {
  companyName: '', rcNumber: '', sector: 'consultancy', state: '', website: '', about: '',
  contactName: '', contactRole: '', phone: '', email: '', password: '', confirm: '',
};

const EmployerRegister = () => {
  const { employerRegister } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState(1);
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const next = (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      toast.error('Enter your organisation name');
      return;
    }
    if (form.website && !/^https?:\/\//i.test(form.website.trim())) {
      toast.error('The website address should start with http:// or https://');
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.contactName.trim() || !form.email.trim()) {
      toast.error('Enter the contact name and email address');
      return;
    }
    if (form.password.length < 8) {
      toast.error('The password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirm) {
      toast.error('The passwords do not match');
      return;
    }
    if (!accept) {
      toast.error('Please confirm the job board terms to continue');
      return;
    }
    setLoading(true);
    try {
      const { confirm, ...body } = form;
      await employerRegister({
        ...body,
        email: body.email.trim().toLowerCase(),
        acceptTerms: true,
      });
      toast.success(
        'Account created. The NIQS Secretariat will review it; you can draft listings while you wait.',
        { duration: 7000 },
      );
      navigate('/employer', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card reg-card">
        <div className="login-logo">
          <img
            src="/brand/lockup-horizontal-light.png"
            alt="Nigerian Institute of Quantity Surveyors"
            style={{ width: 'min(240px, 75%)', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }}
          />
        </div>

        <span className="login-kicker">NIQS Job Board for Employers</span>
        <h1 className="login-heading">Register your organisation</h1>
        <p className="login-subtitle">
          The NIQS Secretariat checks every employer account before its first listing goes live.
        </p>

        <ol className="reg-steps" aria-label="Registration steps">
          <li className={step === 1 ? 'on' : 'done'} aria-current={step === 1 ? 'step' : undefined}>1. Organisation</li>
          <li className={step === 2 ? 'on' : ''} aria-current={step === 2 ? 'step' : undefined}>2. Contact and sign-in</li>
        </ol>

        {step === 1 && (
          <form onSubmit={next} className="login-form">
            <div className="fg">
              <label className="flbl" htmlFor="r-company">Organisation name *</label>
              <input id="r-company" className="fi" value={form.companyName} onChange={set('companyName')} autoComplete="organization" required />
            </div>
            <div className="reg-grid">
              <div className="fg">
                <label className="flbl" htmlFor="r-sector">Sector</label>
                <select id="r-sector" className="fi" value={form.sector} onChange={set('sector')}>
                  {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="r-state">State</label>
                <select id="r-state" className="fi" value={form.state} onChange={set('state')}>
                  <option value="">Not stated</option>
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="reg-grid">
              <div className="fg">
                <label className="flbl" htmlFor="r-rc">CAC RC number</label>
                <input id="r-rc" className="fi" value={form.rcNumber} onChange={set('rcNumber')} placeholder="e.g. RC 123456" />
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="r-web">Website</label>
                <input id="r-web" className="fi" type="url" value={form.website} onChange={set('website')} placeholder="https://" autoComplete="url" />
              </div>
            </div>
            <div className="fg">
              <label className="flbl" htmlFor="r-about">About the organisation</label>
              <textarea id="r-about" className="fi" rows={3} maxLength={1000} value={form.about} onChange={set('about')} placeholder="What you do and the kind of work your QS staff handle" />
            </div>
            <p className="reg-hint">
              A CAC number and website help the Secretariat approve your account sooner.
            </p>
            <button type="submit" className="bsub">Continue</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submit} className="login-form">
            <div className="reg-grid">
              <div className="fg">
                <label className="flbl" htmlFor="r-contact">Your name *</label>
                <input id="r-contact" className="fi" value={form.contactName} onChange={set('contactName')} autoComplete="name" required />
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="r-role">Your role</label>
                <input id="r-role" className="fi" value={form.contactRole} onChange={set('contactRole')} placeholder="e.g. HR Manager" autoComplete="organization-title" />
              </div>
            </div>
            <div className="reg-grid">
              <div className="fg">
                <label className="flbl" htmlFor="r-email">Work email *</label>
                <input id="r-email" className="fi" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="r-phone">Phone</label>
                <input id="r-phone" className="fi" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
              </div>
            </div>
            <div className="reg-grid">
              <div className="fg">
                <label className="flbl" htmlFor="r-pass">Password *</label>
                <input id="r-pass" className="fi" type="password" minLength={8} value={form.password} onChange={set('password')} placeholder="At least 8 characters" autoComplete="new-password" required />
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="r-confirm">Confirm password *</label>
                <input id="r-confirm" className="fi" type="password" minLength={8} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required />
              </div>
            </div>

            <label className="reg-check">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
              <span>
                I confirm listings will be genuine and agree to the job board terms in the{' '}
                <Link to="/terms-of-use" target="_blank" rel="noopener">Terms of Use</Link> and{' '}
                <Link to="/privacy-policy" target="_blank" rel="noopener">Privacy Policy</Link>.
              </span>
            </label>

            <div className="reg-btns">
              <button type="button" className="reg-back" onClick={() => setStep(1)}>Back</button>
              <button type="submit" className="bsub" disabled={loading} style={{ marginTop: 0 }}>
                {loading ? 'Creating account...' : 'Create employer account'}
              </button>
            </div>
          </form>
        )}

        <div className="login-footer">
          <p>
            Already registered?{' '}
            <Link to="/employers/sign-in" className="login-link">Sign in</Link>
          </p>
          <Link to="/employers" className="login-back">&larr; About hiring on NIQS</Link>
        </div>
      </div>

      <style>{`
        .login-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy2) 60%, var(--navy3) 100%);
          padding: 2rem;
          margin-top: 0;
          position: relative;
          overflow: hidden;
        }
        .login-wrap::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .login-card {
          position: relative;
          z-index: 2;
          background: var(--white);
          border-radius: var(--radius-lg);
          padding: 2.5rem 2.2rem;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        }
        .login-card.reg-card { max-width: 560px; }
        .login-logo { text-align: center; margin-bottom: 1rem; }
        .login-kicker {
          display: block;
          text-align: center;
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 1rem;
        }
        .login-heading {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--navy);
          margin-bottom: 0.3rem;
          text-align: center;
        }
        .login-subtitle {
          font-size: 0.82rem;
          color: var(--text3);
          text-align: center;
          margin-bottom: 1.2rem;
          line-height: 1.6;
        }
        .reg-steps {
          display: flex;
          gap: 0.5rem;
          list-style: none;
          padding: 0;
          margin: 0 0 1.3rem;
        }
        .reg-steps li {
          flex: 1;
          text-align: center;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.45rem 0.4rem;
          border-radius: 8px;
          background: var(--off);
          color: var(--text3);
          border-bottom: 3px solid transparent;
        }
        .reg-steps li.on { color: var(--navy); border-bottom-color: var(--gold); background: var(--goldxl); }
        .reg-steps li.done { color: var(--navy); }
        .reg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.9rem; }
        .reg-hint { font-size: 0.74rem; color: var(--text3); margin: 0 0 1rem; line-height: 1.5; }
        .reg-check {
          display: flex;
          gap: 0.55rem;
          align-items: flex-start;
          font-size: 0.78rem;
          color: var(--text2);
          line-height: 1.55;
          margin: 0.4rem 0 1.1rem;
          cursor: pointer;
        }
        .reg-check input { margin-top: 3px; width: 16px; height: 16px; flex-shrink: 0; accent-color: var(--navy); }
        .reg-check a { color: var(--navy); font-weight: 600; text-decoration: underline; }
        .reg-btns { display: flex; gap: 0.6rem; align-items: stretch; }
        .reg-back {
          padding: 0 1.1rem;
          border-radius: 8px;
          border: 1.5px solid var(--border);
          background: var(--white);
          color: var(--navy);
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
          font-family: var(--font-body);
        }
        .login-form { margin-bottom: 1.5rem; }
        .login-footer { text-align: center; }
        .login-footer p { font-size: 0.82rem; color: var(--text3); margin-bottom: 0.6rem; }
        .login-link { color: var(--gold); font-weight: 600; transition: color 0.2s var(--ez); }
        .login-link:hover { color: var(--gold2); }
        .login-back {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.78rem;
          color: var(--text3);
          font-weight: 600;
          transition: color 0.2s var(--ez);
        }
        .login-back:hover { color: var(--navy); }
        @media (max-width: 520px) {
          .login-wrap { padding: 1rem; }
          .login-card { padding: 1.8rem 1.3rem; }
          .reg-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default EmployerRegister;
