import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { employerForgotPassword } from '../../api/jobsApi';

/* Where to go after signing in: the employer page that sent them here, if
   any (ProtectedRoute passes it as state.from), otherwise the dashboard.
   Only paths inside /employer, so this page cannot be used to redirect
   anywhere else. */
const destination = (location) => {
  const from = location.state?.from;
  const path = from ? `${from.pathname || ''}${from.search || ''}` : '';
  return path.startsWith('/employer') && !path.startsWith('/employers') ? path : '/employer';
};

const EmployerSignIn = () => {
  const { employerLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('signin'); // signin | forgot | sent
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email address and password');
      return;
    }
    setLoading(true);
    try {
      await employerLogin(email, password);
      navigate(destination(location), { replace: true });
    } catch (err) {
      // A rejected account gets a 403 carrying the Secretariat's reason.
      toast.error(err.response?.data?.message || 'Sign in failed. Please check your email address and password.');
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Enter the email address you registered with');
      return;
    }
    setLoading(true);
    try {
      await employerForgotPassword(email.trim().toLowerCase());
    } catch {
      // Same answer either way, so the form does not reveal which emails have accounts.
    }
    setLoading(false);
    setMode('sent');
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <img
            src="/brand/lockup-horizontal-light.png"
            alt="Nigerian Institute of Quantity Surveyors"
            style={{ width: 'min(260px, 80%)', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }}
          />
        </div>

        <span className="login-kicker">NIQS Job Board for Employers</span>

        {mode === 'signin' && (
          <>
            <h1 className="login-heading">Employer sign in</h1>
            <p className="login-subtitle">Manage your listings and applicants.</p>

            <form onSubmit={handleSignIn} className="login-form">
              <div className="fg">
                <label className="flbl" htmlFor="emp-email">Email address</label>
                <input
                  id="emp-email"
                  className="fi"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="fg">
                <label className="flbl" htmlFor="emp-password">Password</label>
                <input
                  id="emp-password"
                  className="fi"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="login-forgot">
                <button type="button" onClick={() => setMode('forgot')}>Forgot password?</button>
              </div>

              <button type="submit" className="bsub" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <h1 className="login-heading">Reset your password</h1>
            <p className="login-subtitle">We will email you a link to choose a new password.</p>

            <form onSubmit={handleForgot} className="login-form">
              <div className="fg">
                <label className="flbl" htmlFor="emp-forgot-email">Email address</label>
                <input
                  id="emp-forgot-email"
                  className="fi"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <button type="submit" className="bsub" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
              <div className="login-forgot" style={{ textAlign: 'center', marginTop: '1rem', marginBottom: 0 }}>
                <button type="button" onClick={() => setMode('signin')}>Back to sign in</button>
              </div>
            </form>
          </>
        )}

        {mode === 'sent' && (
          <>
            <h1 className="login-heading">Check your email</h1>
            <p className="login-subtitle" style={{ lineHeight: 1.6 }}>
              If an employer account exists for {email.trim() || 'that address'}, we have sent a link
              to reset its password. The link expires after a short time.
            </p>
            <button type="button" className="bsub" style={{ marginBottom: '1.5rem' }} onClick={() => { setPassword(''); setMode('signin'); }}>
              Back to sign in
            </button>
          </>
        )}

        <div className="login-footer">
          <p>
            New to the job board?{' '}
            <Link to="/employers/register" className="login-link">Register your organisation</Link>
          </p>
          <p>
            NIQS member or admin?{' '}
            <Link to="/login" className="login-link">Sign in here</Link>
          </p>
          <Link to="/employers" className="login-back">
            &larr; About hiring on NIQS
          </Link>
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
        .login-logo { text-align: center; margin-bottom: 1rem; }
        .login-kicker {
          display: block;
          text-align: center;
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 1.2rem;
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
          margin-bottom: 1.5rem;
        }
        .login-form { margin-bottom: 1.5rem; }
        .login-forgot { text-align: right; margin-bottom: 1.2rem; }
        .login-forgot button {
          font-size: 0.78rem;
          color: var(--gold);
          font-weight: 600;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-family: var(--font-body);
        }
        .login-forgot button:hover { color: var(--gold2); }
        .login-footer { text-align: center; }
        .login-footer p { font-size: 0.82rem; color: var(--text3); margin-bottom: 0.6rem; }
        .login-link { color: var(--gold); font-weight: 600; transition: color 0.2s var(--ez); }
        .login-link:hover { color: var(--gold2); }
        .login-back {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          margin-top: 0.3rem;
          font-size: 0.78rem;
          color: var(--text3);
          font-weight: 600;
          transition: color 0.2s var(--ez);
        }
        .login-back:hover { color: var(--navy); }
        @media (max-width: 480px) {
          .login-wrap { padding: 1rem; }
          .login-card { padding: 1.8rem 1.4rem; }
        }
      `}</style>
    </div>
  );
};

export default EmployerSignIn;
