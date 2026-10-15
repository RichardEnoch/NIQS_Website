import { useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import { employerResetPassword } from '../../api/jobsApi';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isAdmin = params.get('type') === 'admin';
  // Job board employers have their own accounts and their own sign-in page.
  const isEmployer = params.get('type') === 'employer';
  const minLen = isAdmin || isEmployer ? 8 : 6;
  const signInPath = isEmployer ? '/employers/sign-in' : '/login';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < minLen) {
      toast.error(`Password must be at least ${minLen} characters`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (isEmployer) {
        await employerResetPassword(token, password);
      } else {
        await API.put(`${isAdmin ? '/auth/admin/reset-password/' : '/auth/reset-password/'}${token}`, { password });
      }
      toast.success('Password reset successfully!');
      navigate(signInPath);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to reset password. The link may have expired.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <img
            src="/NIQS-LOGO-PNG-NAV.png"
            alt="NIQS Logo"
            style={{ height: 64, width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 0.5rem' }}
          />
          <span className="login-logo-sub">Nigerian Institute of Quantity Surveyors</span>
        </div>

        <h1 className="login-heading">Reset Password</h1>
        <p className="login-subtitle">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="fg">
            <label className="flbl" htmlFor="password">New Password</label>
            <input
              id="password"
              className="fi"
              type="password"
              placeholder={`Minimum ${minLen} characters`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={minLen}
            />
          </div>

          <div className="fg">
            <label className="flbl" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              className="fi"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={minLen}
            />
          </div>

          <button type="submit" className="bsub" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="login-footer">
          <Link to={signInPath} className="login-back">
            &larr; Back to Login
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
        .login-footer {
          text-align: center;
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

export default ResetPassword;
