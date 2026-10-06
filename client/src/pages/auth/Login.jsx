import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

/* ?next= brings a member back to the page that sent them here (a members-only
   library title, say). Same-site paths only: a full or protocol-relative URL
   would make this page an open redirect. */
const safeNext = () => {
  const next = new URLSearchParams(window.location.search).get('next') || '';
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '';
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password, isAdmin);
      // Hard redirect so the app re-mounts with a fresh auth check —
      // avoids race conditions between React Router navigation and
      // the AuthContext state update settling.
      window.location.href = isAdmin ? '/admin' : (safeNext() || '/portal');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Login failed. Please check your credentials.';
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* Logo */}
        {/* Light-BG lockup: the card is white. It carries the Institute's
            name already, so the sub-line underneath it would have been the
            name a second time. */}
        <div className="login-logo">
          <img
            src="/brand/lockup-horizontal-light.png"
            alt="Nigerian Institute of Quantity Surveyors"
            style={{ width: 'min(260px, 80%)', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }}
          />
        </div>

        {/* Tabs */}
        <div className="login-tabs">
          <button
            className={`login-tab ${!isAdmin ? 'active' : ''}`}
            onClick={() => setIsAdmin(false)}
            type="button"
          >
            Member Login
          </button>
          <button
            className={`login-tab ${isAdmin ? 'active' : ''}`}
            onClick={() => setIsAdmin(true)}
            type="button"
          >
            Admin Login
          </button>
        </div>

        {/* Heading */}
        <h1 className="login-heading">Welcome Back</h1>
        <p className="login-subtitle">
          Sign in to access your {isAdmin ? 'admin dashboard' : 'member portal'}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="fg">
            <label className="flbl" htmlFor="email">Email Address</label>
            <input
              id="email"
              className="fi"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="fg">
            <label className="flbl" htmlFor="password">Password</label>
            <input
              id="password"
              className="fi"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="login-forgot">
            <Link to={isAdmin ? '/forgot-password?type=admin' : '/forgot-password'}>Forgot password?</Link>
          </div>

          <button type="submit" className="bsub" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer links */}
        <div className="login-footer">
          <p>
            Not yet a member?{' '}
            <Link to="/membership" className="login-link">Apply for membership</Link>
          </p>
          <Link to="/" className="login-back">
            &larr; Back to website
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
        .login-logo {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .login-logo-text {
          display: block;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: var(--navy);
          letter-spacing: 0.04em;
        }
        .login-logo-sub {
          display: block;
          font-size: 0.68rem;
          color: var(--gold);
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 0.1rem;
        }
        .login-tabs {
          display: flex;
          background: var(--off);
          border-radius: var(--radius-sm);
          padding: 4px;
          margin-bottom: 1.5rem;
        }
        .login-tab {
          flex: 1;
          padding: 0.55rem 0.8rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text3);
          text-align: center;
          transition: all 0.22s var(--ez);
          border: none;
          background: none;
          cursor: pointer;
        }
        .login-tab.active {
          background: var(--white);
          color: var(--navy);
          box-shadow: 0 1px 4px rgba(0, 0, 102, 0.1);
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
        .login-form {
          margin-bottom: 1.5rem;
        }
        .login-forgot {
          text-align: right;
          margin-bottom: 1.2rem;
        }
        .login-forgot a {
          font-size: 0.78rem;
          color: var(--gold);
          font-weight: 600;
          transition: color 0.2s var(--ez);
        }
        .login-forgot a:hover {
          color: var(--gold2);
        }
        .login-footer {
          text-align: center;
        }
        .login-footer p {
          font-size: 0.82rem;
          color: var(--text3);
          margin-bottom: 0.8rem;
        }
        .login-link {
          color: var(--gold);
          font-weight: 600;
          transition: color 0.2s var(--ez);
        }
        .login-link:hover {
          color: var(--gold2);
        }
        .login-back {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.78rem;
          color: var(--text3);
          font-weight: 600;
          transition: color 0.2s var(--ez);
        }
        .login-back:hover {
          color: var(--navy);
        }
        @media (max-width: 480px) {
          .login-card {
            padding: 1.8rem 1.4rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
