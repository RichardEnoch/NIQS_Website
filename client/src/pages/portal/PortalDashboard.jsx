import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/common/Icon';

const PortalDashboard = () => {
  const { user } = useAuth();

  const memberName = user?.name || user?.firstName
    ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
    : 'Member';

  const stats = [
    {
      label: 'Membership Status',
      value: user?.status || 'Active',
      color: '#22c55e',
      bg: '#dcfce7',
    },
    {
      label: 'Payment Status',
      value: 'Up to Date',
      color: 'var(--gold)',
      bg: 'var(--goldxl)',
    },
    {
      label: 'Chapter',
      value: user?.chapter || 'Lagos',
      color: 'var(--navy)',
      bg: 'var(--off)',
    },
    {
      label: 'Member Since',
      value: user?.createdAt
        ? new Date(user.createdAt).getFullYear().toString()
        : '2024',
      color: 'var(--navy)',
      bg: 'var(--off)',
    },
  ];

  return (
    <div className="pdash">
      {/* Welcome */}
      <div className="pdash-welcome">
        <h1 className="pdash-welcome-title">
          Welcome back, <em>{memberName}</em>
        </h1>
        <p className="pdash-welcome-sub">
          Here is an overview of your membership.
        </p>
      </div>

      {/* Stats */}
      <div className="pdash-stats">
        {stats.map((s, i) => (
          <div className="pdash-stat" key={i}>
            <span className="pdash-stat-label">{s.label}</span>
            <span
              className="pdash-stat-value"
              style={{ color: s.color, background: s.bg }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="pdash-section">
        <h2 className="pdash-section-title">Quick Actions</h2>
        <div className="pdash-actions">
          <Link to="/portal/profile" className="pdash-action">
            <span className="pdash-action-icon"><Icon name="edit" size="sm" /></span>
            <span>Update Profile</span>
          </Link>
          <Link to="/portal/library" className="pdash-action">
            <span className="pdash-action-icon"><Icon name="library" size="sm" /></span>
            <span>My Library</span>
          </Link>
          <div className="pdash-action disabled" title="Coming Soon">
            <span className="pdash-action-icon"><Icon name="star" size="sm" /></span>
            <span>View Results</span>
            <span className="pdash-action-badge">Soon</span>
          </div>
          <div className="pdash-action disabled" title="Coming Soon">
            <span className="pdash-action-icon"><Icon name="check" size="sm" /></span>
            <span>Download ID Card</span>
            <span className="pdash-action-badge">Soon</span>
          </div>
        </div>
      </div>

      {/* Recent Announcements */}
      <div className="pdash-section">
        <h2 className="pdash-section-title">Recent Announcements</h2>
        <div className="pdash-announcements">
          <div className="pdash-announcement">
            <div className="pdash-announcement-dot" />
            <div>
              <h4>2025 Annual General Meeting</h4>
              <p>The AGM is scheduled for November 2025. More details to follow.</p>
            </div>
          </div>
          <div className="pdash-announcement">
            <div className="pdash-announcement-dot" />
            <div>
              <h4>Membership Renewal Reminder</h4>
              <p>Please ensure your annual dues are up to date for continued access.</p>
            </div>
          </div>
          <div className="pdash-announcement">
            <div className="pdash-announcement-dot" />
            <div>
              <h4>New CPD Workshops Available</h4>
              <p>Check the events page for upcoming professional development sessions.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="pdash-banner">
        <span className="pdash-banner-icon"><Icon name="rocket" size="sm" /></span>
        <div>
          <h3>Full Portal Features Coming Soon</h3>
          <p>
            The IT team is working on expanded portal functionality including results,
            ID cards, payment history, and CPD records. Stay tuned!
          </p>
        </div>
      </div>

      <style>{`
        .pdash-welcome {
          margin-bottom: 2rem;
        }
        .pdash-welcome-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--navy);
          margin-bottom: 0.3rem;
        }
        .pdash-welcome-title em {
          color: var(--gold);
          font-style: normal;
        }
        .pdash-welcome-sub {
          font-size: 0.85rem;
          color: var(--text3);
        }

        /* Stats */
        .pdash-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .pdash-stat {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .pdash-stat-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .pdash-stat-value {
          display: inline-block;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 0.25rem 0.7rem;
          border-radius: 50px;
          width: fit-content;
        }

        /* Section */
        .pdash-section {
          margin-bottom: 2rem;
        }
        .pdash-section-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--navy);
          margin-bottom: 1rem;
        }

        /* Actions */
        .pdash-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .pdash-action {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.9rem 1rem;
          font-size: 0.84rem;
          font-weight: 600;
          color: var(--navy);
          transition: all 0.22s var(--ez);
          cursor: pointer;
        }
        .pdash-action:hover {
          border-color: var(--borderg);
          box-shadow: var(--sh);
        }
        .pdash-action.disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .pdash-action.disabled:hover {
          border-color: var(--border);
          box-shadow: none;
        }
        .pdash-action-icon {
          font-size: 1.1rem;
        }
        .pdash-action-badge {
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

        /* Announcements */
        .pdash-announcements {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .pdash-announcement {
          display: flex;
          align-items: flex-start;
          gap: 0.8rem;
          padding: 1rem 1.2rem;
          border-bottom: 1px solid var(--border);
        }
        .pdash-announcement:last-child {
          border-bottom: none;
        }
        .pdash-announcement-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--gold);
          margin-top: 0.4rem;
          flex-shrink: 0;
        }
        .pdash-announcement h4 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--navy);
          margin-bottom: 0.2rem;
        }
        .pdash-announcement p {
          font-size: 0.78rem;
          color: var(--text2);
          line-height: 1.5;
        }

        /* Banner */
        .pdash-banner {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy2) 100%);
          border-radius: var(--radius);
          padding: 1.5rem;
          color: var(--white);
        }
        .pdash-banner-icon {
          font-size: 1.8rem;
          flex-shrink: 0;
        }
        .pdash-banner h3 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 0.3rem;
        }
        .pdash-banner p {
          font-size: 0.78rem;
          opacity: 0.8;
          line-height: 1.6;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .pdash-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .pdash-actions {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 600px) {
          .pdash-stats {
            grid-template-columns: 1fr;
          }
          .pdash-welcome-title {
            font-size: 1.3rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PortalDashboard;
