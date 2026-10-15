import { useState, useEffect, useRef, useId, Suspense } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/common/Icon';
import { Pill } from '../../components/jobs/JobBits';
import { TONES } from '../../data/jobBoard';

/**
 * The employer area (/employer/*). Same shape as the member portal: a sidebar
 * that becomes a drawer on phones, and the page chunk loading inside it.
 *
 * Every employer page renders inside this layout, so the few pieces they all
 * use (the account status pill, the modal, the error text, and the `.emp-*`
 * styles at the bottom) live here rather than being copied into seven files.
 */

/* Account status as the employer sees it. The Secretariat sets it. */
export const ACCOUNT_STATUS = {
  pending:   { label: 'Pending approval', tone: 'amber' },
  approved:  { label: 'Approved',         tone: 'green' },
  suspended: { label: 'Suspended',        tone: 'red' },
  rejected:  { label: 'Rejected',         tone: 'red' },
};

export function AccountStatusPill({ status }) {
  const s = ACCOUNT_STATUS[status] || ACCOUNT_STATUS.pending;
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

/** The account's standing in one banner: waiting, suspended or rejected. */
export function AccountBanner({ status, statusNote, hours }) {
  if (status === 'approved' || !status) return null;
  const tone = status === 'pending' ? TONES.amber : TONES.red;
  const body = {
    pending: {
      title: 'Your account is waiting for approval',
      text: `Your account is waiting for approval by the NIQS Secretariat, usually within ${hours || 48} hours. You can draft listings meanwhile.`,
    },
    suspended: {
      title: 'Your account is suspended',
      text: 'Your listings are paused and you cannot post new ones. Please contact the NIQS Secretariat.',
    },
    rejected: {
      title: 'Your account was not approved',
      text: 'You cannot post listings with this account. Please contact the NIQS Secretariat if you think this is a mistake.',
    },
  }[status];
  if (!body) return null;
  return (
    <div className="emp-banner" role="status" style={{ background: tone.bg, borderColor: tone.border, color: tone.color }}>
      <Icon name={status === 'pending' ? 'clock' : 'warning'} size="sm" />
      <div>
        <strong>{body.title}</strong>
        <span style={{ color: 'var(--text2)' }}>{body.text}</span>
        {statusNote && status !== 'pending' && (
          <div style={{ marginTop: '.4rem', color: 'var(--text)' }}>
            <b>Note from the Secretariat:</b> {statusNote}
          </div>
        )}
      </div>
    </div>
  );
}

/** The server's message when there is one, otherwise the fallback. */
export const errMsg = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || err?.response?.data?.error || fallback;

/**
 * A plain dialog: closes on Escape, on the close button and on a click
 * outside. `footer` holds the action buttons.
 */
export function Modal({ title, onClose, children, footer, wide = false }) {
  const titleId = useId();
  const boxRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    // Move focus into the dialog so the keyboard starts where the eye does.
    boxRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="emp-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={boxRef}
        className={`emp-modal${wide ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="emp-modal-hd">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="emp-icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size="sm" />
          </button>
        </div>
        <div className="emp-modal-bd">{children}</div>
        {footer && <div className="emp-modal-ft">{footer}</div>}
      </div>
    </div>
  );
}

const EmployerLayout = () => {
  const { employer, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/employers/sign-in');
  };

  const company = employer?.companyName || 'Employer';

  const navItems = [
    { to: '/employer', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/employer/listings', label: 'Listings', icon: 'jobs', end: true },
    { to: '/employer/listings/new', label: 'Post a job', icon: 'add' },
    { to: '/employer/applicants', label: 'Applicants', icon: 'inbox' },
    { to: '/employer/talent', label: 'Talent search', icon: 'search' },
    { to: '/employer/profile', label: 'Company profile', icon: 'office' },
  ];

  return (
    <div className="portal">
      {/* Mobile top bar */}
      <div className="portal-topbar">
        <button
          className="portal-hamburger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
          aria-expanded={sidebarOpen}
        >
          <span /><span /><span />
        </button>
        <h2 className="portal-topbar-title">Employer Portal</h2>
        <Link to="/" className="portal-topbar-home" aria-label="Back to main website">
          <Icon name="home" size="sm" />
        </Link>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="portal-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="portal-sidebar-brand">
          <div>
            <img
              src="/NIQS-LOGO-PNG-NAV.png"
              alt="NIQS Logo"
              style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }}
            />
            <span className="portal-brand-sub" style={{ marginTop: 4 }}>Employer Portal</span>
          </div>
          <Link to="/" className="portal-home-link" title="Back to main website" aria-label="Back to main website">
            <Icon name="home" size="md" color="#fff" />
          </Link>
        </div>

        <div className="portal-sidebar-header">
          {employer?.logo ? (
            <img src={employer.logo} alt="" className="portal-avatar" style={{ objectFit: 'cover', background: '#fff' }} />
          ) : (
            <div className="portal-avatar">{company.charAt(0).toUpperCase()}</div>
          )}
          <div className="portal-user-info" style={{ minWidth: 0 }}>
            <h3 className="portal-user-name" style={{ overflowWrap: 'anywhere' }}>{company}</h3>
            <div style={{ marginTop: 4 }}><AccountStatusPill status={employer?.status} /></div>
          </div>
        </div>

        <nav className="portal-nav" aria-label="Employer portal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `portal-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="portal-nav-icon"><Icon name={item.icon} size="md" /></span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <Link to="/jobs" className="portal-nav-item" onClick={() => setSidebarOpen(false)}>
            <span className="portal-nav-icon"><Icon name="web" size="md" /></span>
            <span>Public job board</span>
          </Link>
        </nav>

        <div className="portal-sidebar-footer">
          <button className="portal-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="portal-main">
        <Suspense fallback={<div style={{ minHeight: '60vh' }} aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </main>

      <style>{`
        .portal { display: flex; min-height: 100vh; background: var(--off); }

        /* --- Topbar --- */
        .portal-topbar {
          display: none; position: fixed; top: 0; left: 0; right: 0; height: 56px;
          background: var(--white); border-bottom: 1px solid var(--border);
          align-items: center; justify-content: space-between; padding: 0 1rem; z-index: 100;
        }
        .portal-topbar-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1rem; font-weight: 700; color: var(--navy); }
        .portal-topbar-home { color: var(--navy); display: flex; }
        .portal-hamburger { display: flex; flex-direction: column; gap: 4px; background: none; border: none; cursor: pointer; padding: 4px; }
        .portal-hamburger span { display: block; width: 20px; height: 2px; background: var(--navy); border-radius: 2px; }

        /* --- Overlay --- */
        .portal-overlay { display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 199; }

        /* --- Sidebar brand bar --- */
        .portal-sidebar-brand {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 1.2rem 0.8rem; border-bottom: 1px solid var(--border);
          background: var(--navy); flex-shrink: 0;
        }
        .portal-brand-sub {
          display: block; font-size: 0.62rem; font-weight: 600; color: rgba(255,255,255,0.5);
          letter-spacing: 0.08em; text-transform: uppercase; margin-top: 2px;
        }
        .portal-home-link {
          display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;
          border-radius: 7px; background: rgba(255,255,255,0.1); text-decoration: none; transition: background 0.15s;
        }
        .portal-home-link:hover { background: rgba(217, 182, 80,0.25); }

        /* --- Sidebar --- */
        .portal-sidebar {
          width: 260px; background: var(--white); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; flex-shrink: 0;
          position: sticky; top: 0; height: 100vh; overflow-y: auto;
        }
        .portal-sidebar-header { padding: 1.5rem 1.2rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 0.8rem; }
        .portal-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: linear-gradient(135deg, var(--navy), var(--navy2)); color: var(--white);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.1rem; font-weight: 700; flex-shrink: 0;
          border: 1px solid var(--border);
        }
        .portal-user-name { font-family: 'Bricolage Grotesque', sans-serif; font-size: 0.88rem; font-weight: 700; color: var(--navy); line-height: 1.2; }

        /* --- Nav --- */
        .portal-nav { flex: 1; padding: 0.8rem 0; }
        .portal-nav-item {
          display: flex; align-items: center; gap: 0.7rem; padding: 0.65rem 1.2rem;
          font-size: 0.84rem; font-weight: 600; color: var(--text2);
          transition: all 0.18s var(--ez); cursor: pointer; border-left: 3px solid transparent;
        }
        .portal-nav-item:hover { background: var(--off); color: var(--navy); }
        .portal-nav-item.active { color: var(--navy); background: var(--goldxl); border-left-color: var(--gold); }
        .portal-nav-icon { width: 20px; text-align: center; }

        /* --- Sidebar Footer --- */
        .portal-sidebar-footer { padding: 1rem 1.2rem; border-top: 1px solid var(--border); }
        .portal-logout {
          width: 100%; padding: 0.55rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 600;
          color: #ef4444; background: #fef2f2; border: 1px solid #fecaca; cursor: pointer; transition: all 0.2s var(--ez);
        }
        .portal-logout:hover { background: #fee2e2; }

        /* --- Main --- */
        .portal-main { flex: 1; padding: 2rem; min-width: 0; }

        /* ── Shared by every employer page ── */
        .emp-page { max-width: 1100px; }
        .emp-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.4rem; }
        .emp-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.5rem; font-weight: 800; color: var(--navy); letter-spacing: -.03em; line-height: 1.15; }
        .emp-title em { font-style: normal; color: var(--gold); }
        .emp-lead { font-size: .85rem; color: var(--text3); margin-top: .3rem; max-width: 640px; line-height: 1.6; }
        .emp-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 1.2rem 1.3rem; min-width: 0; }
        .emp-card + .emp-card { margin-top: 1rem; }
        .emp-card-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1rem; font-weight: 700; color: var(--navy); margin-bottom: .7rem; }
        .emp-muted { font-size: .78rem; color: var(--text3); line-height: 1.6; }
        .emp-text { font-size: .84rem; color: var(--text2); line-height: 1.65; }
        .emp-banner { display: flex; gap: .7rem; align-items: flex-start; padding: .85rem 1rem; border-radius: 12px; font-size: .82rem; line-height: 1.6; margin-bottom: 1.2rem; border: 1px solid; }
        .emp-banner strong { display: block; margin-bottom: .1rem; }
        .emp-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .8rem; margin-bottom: 1.2rem; }
        .emp-stat { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: .9rem 1rem; text-decoration: none; display: block; }
        .emp-stat-n { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--navy); line-height: 1; }
        .emp-stat-l { font-size: .7rem; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: .06em; margin-top: .35rem; }
        .emp-actions { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
        .emp-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: .35rem;
          padding: .5rem .9rem; border-radius: 8px; font-size: .76rem; font-weight: 600; cursor: pointer;
          border: 1.5px solid var(--border); background: var(--white); color: var(--navy);
          font-family: var(--font-body); text-decoration: none; transition: all .15s; white-space: nowrap;
        }
        .emp-btn:hover:not(:disabled) { border-color: var(--navy); }
        .emp-btn:disabled { opacity: .5; cursor: not-allowed; }
        .emp-btn.primary { background: var(--navy); border-color: var(--navy); color: #fff; }
        .emp-btn.primary:hover:not(:disabled) { background: var(--navy3); border-color: var(--navy3); }
        .emp-btn.gold { background: linear-gradient(135deg, var(--gold), var(--gold2)); border-color: transparent; color: #fff; }
        .emp-btn.danger { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }
        .emp-btn.danger:hover:not(:disabled) { border-color: #b91c1c; }
        .emp-btn.sm { padding: .35rem .65rem; font-size: .72rem; }
        .emp-icon-btn { background: none; border: none; cursor: pointer; color: var(--text3); padding: 4px; border-radius: 6px; display: flex; }
        .emp-icon-btn:hover { color: var(--navy); background: var(--off); }
        .emp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
        .emp-form-grid .fw { grid-column: 1 / -1; }
        .emp-check { display: flex; gap: .55rem; align-items: flex-start; font-size: .82rem; color: var(--text2); line-height: 1.5; margin-bottom: .8rem; cursor: pointer; }
        .emp-check input { margin-top: 3px; flex-shrink: 0; width: 16px; height: 16px; accent-color: var(--navy); }
        .emp-hint { font-size: .72rem; color: var(--text3); line-height: 1.5; }
        .emp-error { font-size: .74rem; color: #b91c1c; font-weight: 600; }
        .emp-empty { text-align: center; padding: 2.2rem 1rem; color: var(--text3); font-size: .85rem; }
        .emp-empty .icon { color: var(--gold); margin-bottom: .5rem; display: flex; justify-content: center; }
        .emp-row { display: flex; gap: .8rem; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; padding: .85rem 0; border-top: 1px solid var(--border); }
        .emp-row:first-child { border-top: none; padding-top: 0; }
        .emp-link { color: var(--navy); font-weight: 700; text-decoration: none; }
        .emp-link:hover { color: var(--gold); }
        .emp-tags { display: flex; gap: .35rem; flex-wrap: wrap; }
        .emp-tag { font-size: .7rem; padding: 2px 8px; border-radius: 20px; background: var(--off); border: 1px solid var(--border); color: var(--text2); }

        /* --- Modal --- */
        .emp-modal-back { position: fixed; inset: 0; background: rgba(0, 0, 40, .45); z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .emp-modal { background: var(--white); border-radius: 14px; width: 100%; max-width: 520px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.25); outline: none; }
        .emp-modal.wide { max-width: 720px; }
        .emp-modal-hd { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1rem 1.2rem; border-bottom: 1px solid var(--border); }
        .emp-modal-hd h2 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.05rem; font-weight: 700; color: var(--navy); }
        .emp-modal-bd { padding: 1rem 1.2rem; overflow-y: auto; font-size: .84rem; color: var(--text2); line-height: 1.6; }
        .emp-modal-ft { display: flex; gap: .5rem; justify-content: flex-end; flex-wrap: wrap; padding: .9rem 1.2rem; border-top: 1px solid var(--border); }

        /* --- Responsive --- */
        @media (max-width: 768px) {
          .portal-topbar { display: flex; }
          .portal-overlay { display: block; }
          .portal-sidebar {
            position: fixed; top: 0; left: -280px; height: 100vh; z-index: 200;
            transition: left 0.3s var(--ez); box-shadow: none;
          }
          .portal-sidebar.open { left: 0; box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15); }
          .portal-main { padding: 1.2rem 1rem; margin-top: 56px; }
          .emp-title { font-size: 1.3rem; }
        }
        @media (max-width: 640px) {
          .emp-form-grid { grid-template-columns: 1fr; }
          .emp-card { padding: 1rem; }
          .emp-stats { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
};

export default EmployerLayout;
