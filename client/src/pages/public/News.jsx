import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useNews, { NEWS_FALLBACK_IMAGE } from '../../hooks/useNews';
import PageHero from '../../components/common/PageHero';
import API from '../../api/axios';
import { NEWS_CATEGORIES, newsCategoryLabel } from '../../data/newsCategories';

const CATEGORIES = [{ value: 'All', label: 'All' }, ...NEWS_CATEGORIES];

const NOTE = { textAlign: 'center', color: 'var(--color-txt-3)', marginTop: '2rem' };

/**
 * QS Connect, the Institute's magazine. It used to sit under Research &
 * Development as a "publication" as well, so it appeared twice; at the
 * October 2026 review it was placed here, under News & Announcements, where
 * the menu's QS Connect link already pointed. Shows nothing until editions are
 * uploaded in admin — no sample issues.
 */
function QSConnect() {
  const [issues, setIssues] = useState([]);
  useEffect(() => {
    API.get('/qs-connect').then(r => setIssues(r.data?.issues || [])).catch(() => setIssues([]));
  }, []);
  if (issues.length === 0) return null;
  return (
    <section id="qs-connect" className="section-alt">
      <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
        <div className="ey">Magazine</div>
        <h2 className="sh">QS <em>Connect</em></h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.2rem', marginTop: '1.5rem' }}>
          {issues.map(issue => (
            <div key={issue._id} className="card">
              {issue.coverImage && <img src={issue.coverImage} alt={issue.title} style={{ width: '100%', height: 140, objectFit: 'cover' }} />}
              <div style={{ padding: '1rem' }}>
                <div className="card-title">{issue.title}</div>
                {issue.issueDate && <div style={{ fontSize: '.7rem', color: 'var(--color-txt-3)', marginTop: 4 }}>{issue.issueDate}</div>}
                {issue.fileUrl && (
                  <a href={issue.fileUrl} target="_blank" rel="noopener noreferrer" className="btn bp"
                    style={{ display: 'inline-flex', marginTop: '.7rem', padding: '.45rem 1rem', fontSize: '.72rem', textDecoration: 'none' }}>
                    Read issue
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function News() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [page, setPage] = useState(1);
  // Same feed as the home page's three cards (hooks/useNews).
  const { news, totalPages, status } = useNews({ page, category: activeCategory });

  const filtered = activeCategory === 'All' ? news : news.filter(n => n.category === activeCategory);

  return (
    <>
      <PageHero
        label="Updates"
        title="News & Announcements"
        titleHighlight="Announcements"
        backgroundImage="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1400&q=80&fit=crop"
      />

      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          {/* Filter bar */}
          <div className="filter-bar">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                className={`fbtn${activeCategory === cat.value ? ' on' : ''}`}
                onClick={() => { setActiveCategory(cat.value); setPage(1); }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* News grid */}
          {filtered.length > 0 && (
            <div className="grid-3">
              {filtered.map(n => (
                <Link to={`/news/${n.slug}`} key={n._id} style={{ textDecoration: 'none' }}>
                  <div className="card">
                    <div className="card-img-wrap">
                      <img
                        src={n.image || NEWS_FALLBACK_IMAGE}
                        alt={n.title}
                        className="card-img"
                      />
                    </div>
                    <div className="card-body">
                      <span className="card-tag">{newsCategoryLabel(n.category)}</span>
                      <div className="card-title">{n.title}</div>
                      <p className="card-text">{n.excerpt}</p>
                      <div className="card-date">
                        {new Date(n.date || n.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {status === 'loading' && <p style={NOTE}>Loading news…</p>}

          {status === 'error' && (
            <p style={NOTE}>We could not load the news just now. Please try again shortly.</p>
          )}

          {status === 'ready' && filtered.length === 0 && (
            <p style={NOTE}>
              {activeCategory === 'All'
                ? 'No news articles have been published yet.'
                : 'No news articles in this category yet.'}
            </p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem', marginTop: '2.5rem', alignItems: 'center' }}>
              <button className="btn bo" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
              <span style={{ fontSize: '.8rem', color: 'var(--color-txt-3)', padding: '0 1rem' }}>Page {page} of {totalPages}</span>
              <button className="btn bo" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      </section>
      <QSConnect />
    </>
  );
}
