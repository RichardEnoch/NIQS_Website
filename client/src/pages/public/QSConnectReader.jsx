import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import API from '../../api/axios';
import { qscPageCount, qscPageUrl } from '../../data/qsConnectPages';

/**
 * Reads an edition of QS Connect on the site (Nov 2026).
 *
 * The editions are 20-55 MB PDFs, and a browser shows nothing of a PDF until
 * the whole file has arrived, so "Read issue" used to open a blank tab for a
 * minute or more on a Nigerian mobile connection. Here every page is a
 * pre-rendered image on the CDN (data/qsConnectPages.js), loaded only as the
 * reader scrolls to it; the first pages appear in a second or two. The PDF
 * stays one click away for anyone who wants to keep a copy.
 *
 * An edition uploaded in admin without rendered pages falls back to its PDF.
 */
export default function QSConnectReader() {
  const { volume } = useParams();
  const [issues, setIssues] = useState(null);
  const [current, setCurrent] = useState(1);
  const pagesRef = useRef(null);

  useEffect(() => {
    API.get('/qs-connect')
      .then(r => setIssues(r.data?.issues || []))
      .catch(() => setIssues([]));
  }, []);

  const count = qscPageCount(volume);
  const issue = useMemo(() => (issues || []).find(i => String(i.volume) === String(volume)), [issues, volume]);
  const idx = (issues || []).findIndex(i => String(i.volume) === String(volume));
  const newer = idx > 0 ? issues[idx - 1] : null;
  const older = idx >= 0 && idx < (issues || []).length - 1 ? issues[idx + 1] : null;
  const title = issue?.title || `QS Connect Vol. ${volume}`;

  useEffect(() => { document.title = `${title} — NIQS`; window.scrollTo(0, 0); setCurrent(1); }, [title]);

  /* Which page is on screen, for the "Page n of N" counter. */
  useEffect(() => {
    const root = pagesRef.current;
    if (!root || !count) return undefined;
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) setCurrent(Number(e.target.dataset.page)); }),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    root.querySelectorAll('[data-page]').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [count, volume]);

  const goTo = (n) => {
    const el = pagesRef.current?.querySelector(`[data-page="${n}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="qsr">
      <div className="qsr-bar">
        <div className="qsr-bar-in">
          <Link to="/news#qs-connect" className="qsr-back">&larr; All editions</Link>
          <div className="qsr-title">
            <strong>{title}</strong>
            {issue?.issueDate && <span>{issue.issueDate}</span>}
          </div>
          <div className="qsr-tools">
            {count > 0 && (
              <label className="qsr-pageno">
                Page{' '}
                <select value={current} onChange={(e) => goTo(Number(e.target.value))} aria-label="Go to page">
                  {Array.from({ length: count }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                </select>
                {' '}of {count}
              </label>
            )}
            {issue?.fileUrl && (
              <a href={issue.fileUrl} className="qsr-pdf" target="_blank" rel="noopener noreferrer" download>
                Download PDF
              </a>
            )}
          </div>
        </div>
      </div>

      {count > 0 ? (
        <div className="qsr-pages" ref={pagesRef}>
          {Array.from({ length: count }, (_, i) => (
            <div className="qsr-page" key={`${volume}-${i}`} data-page={i + 1}>
              <img
                src={qscPageUrl(volume, i + 1)}
                alt={`${title}, page ${i + 1}`}
                loading={i < 2 ? 'eager' : 'lazy'}
                decoding="async"
                width="1240"
                height="1754"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="ct" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          {issues === null ? (
            <p className="sd" style={{ margin: '0 auto' }}>Loading…</p>
          ) : issue?.fileUrl ? (
            <>
              <p className="sd" style={{ margin: '0 auto 1.2rem' }}>This edition is available as a PDF.</p>
              <a href={issue.fileUrl} className="btn bp" target="_blank" rel="noopener noreferrer">Open the PDF</a>
            </>
          ) : (
            <p className="sd" style={{ margin: '0 auto' }}>
              This edition could not be found. See <Link to="/news#qs-connect">all QS Connect editions</Link>.
            </p>
          )}
        </div>
      )}

      {(newer || older) && (
        <div className="qsr-nav">
          {older ? <Link to={`/qs-connect/${older.volume}`}>&larr; {older.title}</Link> : <span />}
          {newer ? <Link to={`/qs-connect/${newer.volume}`}>{newer.title} &rarr;</Link> : <span />}
        </div>
      )}
    </div>
  );
}
