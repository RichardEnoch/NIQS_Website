import { useState, Suspense } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/common/Icon';

const PortalLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const memberName = user?.name || user?.firstName
    ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
    : 'Member';

  const memberType = user?.membershipType || user?.membership || 'Member';

  const navItems = [
    { to: '/portal', label: 'Dashboard', icon: '\u2302', end: true },
    { to: '/portal/profile', label: 'My Profile', icon: 'account' },
    { to: '/portal/library', label: 'My Library', icon: 'library' },
    { label: 'My Results', icon: 'award', comingSoon: true },
    { label: 'ID Card', icon: 'idCard', comingSoon: true },
    { label: 'Payments', icon: '\u20A6', comingSoon: true },
    { label: 'CPD Records', icon: 'certificate', comingSoon: true },
  ];

  return (
    <div className="portal">
      {/* Mobile top bar */}
      <div className="portal-topbar">
        <button
          className="portal-hamburger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <span /><span /><span />
        </button>
        <h2 className="portal-topbar-title">Member Portal</h2>
        <div className="portal-topbar-bell" title="Notifications coming soon">
          <Icon name="notification" size="sm" />
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="portal-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* NIQS branding + home link */}
        <div className="portal-sidebar-brand">
          <div>
            <img
              src="/NIQS-LOGO-PNG-NAV.png"
              alt="NIQS Logo"
              style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }}
            />
            <span className="portal-brand-sub" style={{ marginTop: 4 }}>Member Portal</span>
          </div>
          <Link to="/" className="portal-home-link" title="Back to main website">
            <Icon name="home" size="md" />
          </Link>
        </div>

        <div className="portal-sidebar-header">
          <div className="portal-avatar">
            {memberName.charAt(0).toUpperCase()}
          </div>
          <div className="portal-user-info">
            <h3 className="portal-user-name">{memberName}</h3>
            <span className="portal-user-type">{memberType}</span>
          </div>
        </div>

        <nav className="portal-nav">
          {navItems.map((item, idx) =>
            item.comingSoon ? (
              <div key={idx} className="portal-nav-item disabled" title="Coming Soon">
                <span className="portal-nav-icon"><Icon name={item.icon} size="md" /></span>
                <span>{item.label}</span>
                <span className="portal-soon-badge">Soon</span>
              </div>
            ) : (
              <NavLink
                key={idx}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `portal-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <span className="portal-nav-icon"><Icon name={item.icon} size="md" /></span>
                <span>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>

        <div className="portal-sidebar-footer">
          <button className="portal-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="portal-main">
        {/* Keeps the portal sidebar mounted while a page chunk loads. */}
        <Suspense fallback={<div style={{ minHeight: '60vh' }} aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </main>

      <style>{`
        .portal {
          display: flex;
          min-height: 100vh;
          background: var(--off);
        }

        /* --- Topbar --- */
        .portal-topbar {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 56px;
          background: var(--white);
          border-bottom: 1px solid var(--border);
          align-items: center;
          justify-content: space-between;
          padding: 0 1rem;
          z-index: 100;
        }
        .portal-topbar-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--navy);
        }
        .portal-topbar-bell {
          font-size: 1.2rem;
          cursor: pointer;
          opacity: 0.5;
        }
        .portal-hamburger {
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        .portal-hamburger span {
          display: block;
          width: 20px;
          height: 2px;
          background: var(--navy);
          border-radius: 2px;
        }

        /* --- Overlay --- */
        .portal-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 199;
        }

        /* --- Sidebar brand bar --- */
        .portal-sidebar-brand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.2rem 0.8rem;
          border-bottom: 1px solid var(--border);
          background: var(--navy);
          flex-shrink: 0;
        }
        .portal-brand-name {
          display: block;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.15rem;
          font-weight: 800;
          color: #D9B650;
          line-height: 1;
        }
        .portal-brand-sub {
          display: block;
          font-size: 0.62rem;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .portal-home-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 7px;
          background: rgba(255,255,255,0.1);
          text-decoration: none;
          font-size: 0.9rem;
          transition: background 0.15s;
        }
        .portal-home-link:hover {
          background: rgba(217, 182, 80,0.25);
        }

        /* --- Sidebar --- */
        .portal-sidebar {
          width: 260px;
          background: var(--white);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }
        .portal-sidebar-header {
          padding: 1.5rem 1.2rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }
        .portal-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--navy), var(--navy2));
          color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .portal-user-name {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--navy);
          line-height: 1.2;
        }
        .portal-user-type {
          font-size: 0.7rem;
          color: var(--gold);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* --- Nav --- */
        .portal-nav {
          flex: 1;
          padding: 0.8rem 0;
        }
        .portal-nav-item {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.65rem 1.2rem;
          font-size: 0.84rem;
          font-weight: 600;
          color: var(--text2);
          transition: all 0.18s var(--ez);
          cursor: pointer;
          border-left: 3px solid transparent;
        }
        .portal-nav-item:hover {
          background: var(--off);
          color: var(--navy);
        }
        .portal-nav-item.active {
          color: var(--navy);
          background: var(--goldxl);
          border-left-color: var(--gold);
        }
        .portal-nav-item.disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .portal-nav-item.disabled:hover {
          background: none;
          color: var(--text2);
        }
        .portal-nav-icon {
          font-size: 1rem;
          width: 20px;
          text-align: center;
        }
        .portal-soon-badge {
          margin-left: auto;
          font-size: 0.6rem;
          font-weight: 700;
          color: var(--text3);
          background: var(--off2);
          padding: 0.1rem 0.4rem;
          border-radius: 50px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* --- Sidebar Footer --- */
        .portal-sidebar-footer {
          padding: 1rem 1.2rem;
          border-top: 1px solid var(--border);
        }
        .portal-logout {
          width: 100%;
          padding: 0.55rem;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          font-weight: 600;
          color: #ef4444;
          background: #fef2f2;
          border: 1px solid #fecaca;
          cursor: pointer;
          transition: all 0.2s var(--ez);
        }
        .portal-logout:hover {
          background: #fee2e2;
        }

        /* --- Main --- */
        .portal-main {
          flex: 1;
          padding: 2rem;
          min-width: 0;
        }

        /* --- Responsive --- */
        @media (max-width: 768px) {
          .portal-topbar {
            display: flex;
          }
          .portal-overlay {
            display: block;
          }
          .portal-sidebar {
            position: fixed;
            top: 0;
            left: -280px;
            height: 100vh;
            z-index: 200;
            transition: left 0.3s var(--ez);
            box-shadow: none;
          }
          .portal-sidebar.open {
            left: 0;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
          }
          .portal-main {
            padding: 1.2rem;
            margin-top: 56px;
          }
        }
      `}</style>
    </div>
  );
};

export default PortalLayout;
