import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import BookCover from '../../components/library/BookCover';
import { libraryApi, TYPE_LABEL } from '../../api/libraryApi';
import '../../styles/library.css';

const TABS = [
  { k: 'in_progress', l: 'Reading' },
  { k: 'saved',       l: 'Saved' },
  { k: 'completed',   l: 'Finished' },
  { k: 'all',         l: 'All' },
];

const STATUS_PILL = {
  completed:   ['done', 'Finished'],
  in_progress: ['prog', 'Reading'],
  saved:       ['saved', 'Saved'],
};

export default function PortalLibrary() {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(false);
  const [tab, setTab]     = useState('in_progress');

  useEffect(() => {
    libraryApi.myShelf().then(setData).catch(() => setError(true));
  }, []);

  const shelf = data?.shelf || [];
  const rows = shelf.filter((s) => {
    if (tab === 'all') return true;
    if (tab === 'saved') return s.saved;
    return s.status === tab;
  });

  const stats = [
    { label: 'Reading now',   value: data?.summary.inProgress ?? '—' },
    { label: 'Finished',      value: data?.summary.completed ?? '—' },
    { label: 'Saved',         value: data?.summary.saved ?? '—' },
    { label: 'CPD hours earned', value: data?.summary.cpdHours ?? '—' },
  ];

  return (
    <div className="pdash lib-portal">
      <div className="pdash-welcome">
        <h1 className="pdash-welcome-title">My <em>Library</em></h1>
        <p className="pdash-welcome-sub">What you are reading, what you have saved, and what you have finished in the NIQS Digital Library.</p>
      </div>

      <div className="pdash-stats">
        {stats.map((s) => (
          <div className="pdash-stat" key={s.label}>
            <span className="pdash-stat-label">{s.label}</span>
            <span className="pdash-stat-num">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="pdash-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 className="pdash-section-title" style={{ margin: 0 }}>My Shelf</h2>
          <Link to="/library" className="btn bp" style={{ padding: '.55rem 1rem', fontSize: '.74rem' }}>
            <Icon name="search" size="sm" /> Browse the library
          </Link>
        </div>

        <div className="lib-tabs" role="tablist" style={{ marginTop: '1rem' }}>
          {TABS.map((t) => (
            <button key={t.k} role="tab" aria-selected={tab === t.k} className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>{t.l}</button>
          ))}
        </div>

        {error ? (
          <p style={{ color: 'var(--color-txt-3)', fontSize: '.85rem' }}>Your shelf could not be loaded. Please refresh the page.</p>
        ) : !data ? (
          <div className="lib-pshelf">
            {[0, 1, 2].map((i) => <div key={i} className="sk" style={{ height: 96, borderRadius: 12 }} />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="lib-empty">
            <Icon name="library" size="xl" />
            <h4>{shelf.length === 0 ? 'Your shelf is empty' : 'Nothing here yet'}</h4>
            <p style={{ fontSize: '.8rem', marginBottom: '1rem' }}>
              {shelf.length === 0 ? 'Open or save a title in the library and it will appear here.' : 'Titles move here as you read them.'}
            </p>
            {shelf.length === 0 && <Link to="/library" className="btn bp">Find something to read</Link>}
          </div>
        ) : (
          <div className="lib-pshelf">
            {rows.map((s) => {
              const [cls, label] = STATUS_PILL[s.status] || STATUS_PILL.in_progress;
              return (
                <Link key={s.item._id} to={`/library/${s.item.slug}`} className="lib-prow">
                  <BookCover item={s.item} showBadge={false} />
                  <div style={{ minWidth: 0 }}>
                    <div className="lib-prow-t">{s.item.title}</div>
                    <div className="lib-prow-s">
                      {TYPE_LABEL[s.item.type] || 'Resource'} · {s.item.category}
                      {s.status === 'completed' && s.completedAt ? ` · finished ${new Date(s.completedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                      {s.status === 'completed' && s.item.cpdHours ? ` · ${s.item.cpdHours} CPD hrs` : ''}
                    </div>
                    {s.status !== 'saved' && <div className="lib-prog" style={{ maxWidth: 320 }}><span style={{ width: `${s.percent}%` }} /></div>}
                  </div>
                  <span className={`lib-pill ${cls}`}>{s.status === 'in_progress' ? `${s.percent}%` : label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
