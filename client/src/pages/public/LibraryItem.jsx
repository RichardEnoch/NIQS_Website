import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '../../components/common/Icon';
import BookCover from '../../components/library/BookCover';
import BookCard from '../../components/library/BookCard';
import { useAuth } from '../../context/AuthContext';
import { libraryApi, TYPE_LABEL, TYPE_ICON, loginFor } from '../../api/libraryApi';
import '../../styles/library.css';

const STEPS = [0, 25, 50, 75, 100];

export default function LibraryItem() {
  const { slug } = useParams();
  const { pathname } = useLocation();
  const { user, admin } = useAuth();
  const [data, setData]         = useState(null);
  const [error, setError]       = useState('');
  const [opening, setOpening]   = useState(false);
  const [progress, setProgress] = useState(null);

  // A new title is a new page: start at the top, not at the related-items row
  // the reader clicked from.
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  // useCanonical only knows static paths; name the tab after the title.
  useEffect(() => {
    if (data?.item) document.title = `${data.item.title} — Digital Library — NIQS`;
  }, [data]);

  useEffect(() => {
    setData(null); setError('');
    libraryApi.item(slug)
      .then((d) => { setData(d); setProgress(d.progress); })
      .catch((e) => setError(e.response?.status === 404 ? 'notfound' : 'failed'));
  }, [slug, user]);

  if (error) {
    return (
      <div className="ct" style={{ minHeight: '60vh', paddingTop: '9rem', textAlign: 'center' }}>
        <Icon name="library" size="xl" color="var(--color-txt-3)" />
        <h1 className="sh" style={{ marginTop: '1rem' }}>{error === 'notfound' ? 'This title is not in the library' : 'The library could not be reached'}</h1>
        <p className="sd" style={{ margin: '0 auto 1.5rem' }}>
          {error === 'notfound' ? 'It may have been withdrawn or renamed.' : 'Please try again in a moment.'}
        </p>
        <Link to="/library" className="btn bp">Back to the library</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ct" style={{ paddingTop: '8rem', paddingBottom: '5rem' }}>
        <div className="lib-detail">
          <div className="sk" style={{ aspectRatio: '3 / 4', borderRadius: 12 }} />
          <div><div className="sk sk-title" /><div className="sk sk-line" /><div className="sk sk-line w90" /></div>
        </div>
      </div>
    );
  }

  const { item, related } = data;
  const isMember = Boolean(user);
  const canOpen = !item.locked;
  const by = item.authors?.length ? item.authors.join(', ') : '';

  const openItem = async () => {
    // Open the tab inside the click, before the await, so popup blockers allow it.
    const tab = window.open('', '_blank');
    setOpening(true);
    try {
      const { url } = await libraryApi.open(item._id);
      if (tab) { tab.opener = null; tab.location.href = url; } else window.location.href = url;
      if (isMember && !progress) setProgress({ percent: 0, status: 'in_progress', saved: false });
    } catch (e) {
      if (tab) tab.close();
      toast.error(e.response?.data?.message || 'Could not open this item');
    } finally { setOpening(false); }
  };

  const saveProgress = async (body, msg) => {
    try {
      const p = await libraryApi.progress(item._id, body);
      setProgress(p);
      if (msg) toast.success(msg);
    } catch (e) { toast.error(e.response?.data?.message || 'Could not save'); }
  };

  const specs = [
    ['Subject', item.category],
    ['Format', TYPE_LABEL[item.type] || 'Resource'],
    ['Published', item.year],
    ['Pages', item.pages || null],
    ['Publisher', item.publisher],
    item.cpdHours ? ['CPD hours', item.cpdHours] : ['ISBN', item.isbn],
  ].filter(([, v]) => v);

  return (
    <>
      <section style={{ background: '#fff', paddingTop: 0 }}>
        <div className="ct" style={{ paddingTop: '7.5rem', paddingBottom: '4rem' }}>
          <nav className="lib-crumbs" aria-label="Breadcrumb">
            <Link to="/library">Digital Library</Link>
            <span>/</span>
            <Link to={`/library?category=${encodeURIComponent(item.category)}`}>{item.category}</Link>
            <span>/</span>
            <span style={{ color: 'var(--color-navy)' }}>{item.title}</span>
          </nav>

          <div className="lib-detail">
            <div className="lib-cover-col">
              <BookCover item={item} />
            </div>

            <div>
              <div className="lib-detail-type"><Icon name={TYPE_ICON[item.type] || 'folder'} size="sm" /> {TYPE_LABEL[item.type] || 'Resource'}</div>
              <h1>{item.title}</h1>
              {item.subtitle && <div className="lib-detail-sub">{item.subtitle}</div>}
              {by && <div className="lib-detail-by">by <strong>{by}</strong></div>}

              {canOpen ? (
                <div className="lib-actions">
                  <button type="button" className="btn bp" onClick={openItem} disabled={opening}>
                    <Icon name={item.type === 'video' ? 'video' : 'eye'} size="sm" />
                    {opening ? 'Opening…' : item.type === 'video' || item.type === 'course' ? 'Start' : progress?.percent ? 'Continue reading' : 'Read now'}
                  </button>
                  {isMember && (
                    <button type="button" className={`lib-btn-ghost ${progress?.saved ? 'on' : ''}`}
                      onClick={() => saveProgress({ saved: !progress?.saved }, progress?.saved ? 'Removed from your shelf' : 'Saved to your shelf')}>
                      <Icon name={progress?.saved ? 'check' : 'add'} size="sm" />
                      {progress?.saved ? 'On your shelf' : 'Save to shelf'}
                    </button>
                  )}
                  <button type="button" className="lib-btn-ghost" onClick={() => {
                    navigator.clipboard?.writeText(window.location.href).then(() => toast.success('Link copied'), () => {});
                  }}>
                    <Icon name="share" size="sm" /> Share
                  </button>
                </div>
              ) : (
                <div className="lib-lockbox">
                  <span className="lib-lockbox-ico"><Icon name="lock" size="md" /></span>
                  <div>
                    <h4>For NIQS members</h4>
                    <p>Sign in with your membership to read this title, track your progress and log its CPD hours.</p>
                    <div style={{ display: 'flex', gap: '.6rem', marginTop: '.8rem', flexWrap: 'wrap' }}>
                      <Link to={loginFor(pathname)} className="btn bp">Member Sign In</Link>
                      <Link to="/membership" className="lib-btn-ghost" style={{ textDecoration: 'none' }}>Become a member</Link>
                    </div>
                  </div>
                </div>
              )}

              {isMember && progress && (
                <div className="lib-progress-card">
                  <div className="lib-progress-top">
                    <strong>{progress.status === 'completed' ? 'Finished' : 'Your progress'}</strong>
                    <span>
                      {progress.percent || 0}% {progress.status === 'completed' && item.cpdHours ? `· ${item.cpdHours} CPD hrs logged` : ''}
                    </span>
                  </div>
                  <div className="lib-prog lg"><span style={{ width: `${progress.percent || 0}%` }} /></div>
                  <div className="lib-steps" role="group" aria-label="How far have you read?">
                    {STEPS.map((s) => (
                      <button key={s} type="button" className={progress.percent === s ? 'on' : ''}
                        onClick={() => saveProgress({ percent: s }, s === 100 ? 'Marked as finished' : null)}>
                        {s === 100 ? 'Finished' : `${s}%`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {admin && (
                <p style={{ fontSize: '.72rem', color: 'var(--color-txt-3)' }}>
                  Signed in as an administrator. <Link to="/admin/library" style={{ color: 'var(--color-navy)' }}>Edit in the admin panel</Link>
                </p>
              )}

              {specs.length > 0 && (
                <div className="lib-specs">
                  {specs.map(([l, v]) => (
                    <div className="lib-spec" key={l}><div className="lib-spec-l">{l}</div><div className="lib-spec-v">{v}</div></div>
                  ))}
                </div>
              )}

              {item.description && <div className="lib-desc">{item.description}</div>}

              {item.tags?.length > 0 && (
                <div className="lib-tags">
                  {item.tags.map((t) => <Link key={t} to={`/library?q=${encodeURIComponent(t)}`} className="lib-tag" style={{ textDecoration: 'none' }}>#{t}</Link>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {related?.length > 0 && (
        <section className="section-alt">
          <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '5rem' }}>
            <div className="ey">More in {item.category}</div>
            <h2 className="sh" style={{ marginBottom: '2rem' }}>You may also <em>need</em></h2>
            <div className="lib-grid">
              {related.map((r) => <BookCard key={r._id} item={r} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
