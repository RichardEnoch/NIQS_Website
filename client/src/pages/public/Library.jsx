import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import Icon from '../../components/common/Icon';
import BookCard from '../../components/library/BookCard';
import { useAuth } from '../../context/AuthContext';
import { libraryApi, TYPE_LABEL, LIBRARY_CATEGORIES } from '../../api/libraryApi';
import '../../styles/library.css';

const PAGE_SIZE = 24;

const SORTS = [
  { v: 'curated', l: 'Recommended' },
  { v: 'newest',  l: 'Newest added' },
  { v: 'popular', l: 'Most read' },
  { v: 'year',    l: 'Publication year' },
  { v: 'title',   l: 'Title A–Z' },
];

/* Shown until the first real item is published, in the same way the other
   knowledge pages show sample issues — labelled as samples, never linked. */
const SAMPLES = [
  { _id: 's1', type: 'standard', access: 'members', year: 2024, title: 'NIQS Standard Method of Measurement for Building Works', authors: ['NIQS Technical Committee'], category: 'Measurement & Estimating' },
  { _id: 's2', type: 'guide',    access: 'members', year: 2023, title: 'Cost Planning and Control: A Practice Guide', authors: ['NIQS Practice Board'], category: 'Cost Management' },
  { _id: 's3', type: 'book',     access: 'public',  year: 2022, title: 'Public Procurement Act 2007: Notes for Quantity Surveyors', publisher: 'NIQS', category: 'Procurement & Contracts' },
  { _id: 's4', type: 'paper',    access: 'public',  year: 2024, title: 'BIM-Based Quantity Take-off in Nigerian Practice', authors: ['Journal of QS'], category: 'Digital Construction & BIM' },
  { _id: 's5', type: 'course',   access: 'members', year: 2025, title: 'TPC Exam Preparation: Measurement and Valuation', authors: ['NIQS Education Committee'], category: 'Exam Preparation' },
  { _id: 's6', type: 'guide',    access: 'members', year: 2023, title: 'Final Accounts and Valuations', authors: ['NIQS Practice Board'], category: 'Professional Practice' },
  { _id: 's7', type: 'template', access: 'public',  year: 2025, title: 'Bill of Quantities Template, 2025 Edition', publisher: 'NIQS', category: 'Measurement & Estimating' },
  { _id: 's8', type: 'book',     access: 'members', year: 2021, title: 'Life-Cycle Costing and Sustainable Construction', authors: ['NIQS Research Committee'], category: 'Sustainability' },
];

export default function Library() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q        = params.get('q') || '';
  const category = params.get('category') || '';
  const type     = params.get('type') || '';
  const sort     = params.get('sort') || 'curated';
  const page     = Math.max(1, parseInt(params.get('page'), 10) || 1);

  const [draft, setDraft]       = useState(q);
  const [facets, setFacets]     = useState(null);
  const [result, setResult]     = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading]   = useState(true);
  const [progress, setProgress] = useState({});

  useEffect(() => { setDraft(q); }, [q]);

  useEffect(() => {
    libraryApi.facets().then(setFacets).catch(() => setFacets({ total: 0, free: 0, categories: [], types: [], featured: [] }));
  }, [user]);

  useEffect(() => {
    if (!user) { setProgress({}); return; }
    libraryApi.myShelf()
      .then((d) => setProgress(Object.fromEntries(d.shelf.map((s) => [s.item._id, s.percent]))))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    setLoading(true);
    libraryApi.list({ q: q || undefined, category: category || undefined, type: type || undefined, sort, page, limit: PAGE_SIZE })
      .then(setResult)
      .catch(() => setResult({ items: [], total: 0, pages: 1 }))
      .finally(() => setLoading(false));
  }, [q, category, type, sort, page]);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: false });
  };

  const submitSearch = (e) => { e.preventDefault(); set({ q: draft.trim() }); };

  const isEmptyLibrary = facets && facets.total === 0;
  const filtering = Boolean(q || category || type);

  const categoryList = useMemo(() => {
    const counts = Object.fromEntries((facets?.categories || []).map((c) => [c.name, c.count]));
    const known = LIBRARY_CATEGORIES.filter((c) => counts[c]);
    const extra = Object.keys(counts).filter((c) => !LIBRARY_CATEGORIES.includes(c)).sort();
    return [...known, ...extra].map((name) => ({ name, count: counts[name] }));
  }, [facets]);

  return (
    <>
      <PageHero
        label="Knowledge Hub"
        title="NIQS Digital Library"
        titleHighlight="Digital Library"
        subtitle="Standards, practice guides, research and exam preparation for the Nigerian quantity surveyor, in one place and readable anywhere."
        backgroundImage="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1400&q=80&fit=crop"
      />

      {/* ══ SEARCH ══ */}
      <section style={{ background: '#fff', paddingTop: 0, paddingBottom: 0 }}>
        <div className="ct lib-search">
          <form className="lib-search-box" onSubmit={submitSearch} role="search">
            <span className="lib-search-ico"><Icon name="search" size="sm" /></span>
            <input
              type="search" value={draft} onChange={(e) => setDraft(e.target.value)}
              placeholder="Search titles, authors and topics…" aria-label="Search the library"
            />
            <button type="submit" className="btn bp">Search</button>
          </form>
          <div className="lib-quick">
            <span>Popular:</span>
            {['SMM', 'Procurement', 'Final accounts', 'BIM', 'TPC'].map((t) => (
              <button key={t} type="button" onClick={() => set({ q: t })}>{t}</button>
            ))}
          </div>

          <div className="lib-stats">
            <Stat n={facets?.total} l="Titles in the library" />
            <Stat n={facets?.categories?.length} l="Subject areas" />
            <Stat n={facets?.free} l="Free to the public" />
            <Stat n={user ? Object.keys(progress).length : 'All'} l={user ? 'On your shelf' : 'Open to members'} />
          </div>
        </div>
      </section>

      {/* ══ FEATURED ══ */}
      {!filtering && (facets?.featured?.length > 0 || isEmptyLibrary) && (
        <section style={{ background: '#fff', paddingTop: 0, paddingBottom: '1rem' }}>
          <div className="ct" style={{ paddingTop: '3.5rem' }}>
            <div className="ey">Featured</div>
            <h2 className="sh">On the <em>Shelf</em></h2>
            {isEmptyLibrary && (
              <p style={{ fontSize: '.73rem', color: 'var(--color-txt-3)', fontStyle: 'italic' }}>
                Sample titles shown. The catalogue fills as the secretariat publishes items.
              </p>
            )}
            <div className="lib-shelf" style={{ marginTop: '1.5rem' }}>
              {(isEmptyLibrary ? SAMPLES.slice(0, 6) : facets.featured).map((item) => (
                <BookCard key={item._id} item={item} sample={isEmptyLibrary} progress={progress[item._id]} />
              ))}
            </div>
            <div className="lib-shelf-base" />
          </div>
        </section>
      )}

      {/* ══ BROWSE ══ */}
      <section className="section-alt" id="browse">
        <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '5rem' }}>
          <div className="ey">Browse</div>
          <h2 className="sh" style={{ marginBottom: '2rem' }}>The <em>Catalogue</em></h2>

          <div className="lib-layout">
            <aside className="lib-rail" aria-label="Filters">
              <div>
                <div className="lib-rail-h">Subject</div>
                <Facet label="All subjects" count={facets?.total} on={!category} onClick={() => set({ category: '' })} />
                {categoryList.map((c) => (
                  <Facet key={c.name} label={c.name} count={c.count} on={category === c.name} onClick={() => set({ category: c.name })} />
                ))}
              </div>
              <div>
                <div className="lib-rail-h">Format</div>
                <Facet label="All formats" on={!type} onClick={() => set({ type: '' })} />
                {(facets?.types || []).map((t) => (
                  <Facet key={t.name} label={TYPE_LABEL[t.name] || t.name} count={t.count} on={type === t.name} onClick={() => set({ type: t.name })} />
                ))}
              </div>
            </aside>

            <div>
              <div className="lib-chips" role="tablist" aria-label="Subjects">
                <button className={`lib-chip ${!category ? 'on' : ''}`} onClick={() => set({ category: '' })}>All</button>
                {categoryList.map((c) => (
                  <button key={c.name} className={`lib-chip ${category === c.name ? 'on' : ''}`} onClick={() => set({ category: c.name })}>{c.name}</button>
                ))}
              </div>

              <div className="lib-toolbar">
                <div className="lib-count">
                  {loading ? 'Loading…' : (
                    <>
                      <strong>{isEmptyLibrary ? SAMPLES.length : result.total}</strong> {(isEmptyLibrary ? SAMPLES.length : result.total) === 1 ? 'title' : 'titles'}
                      {q && <> for “{q}”</>}
                      {category && <> in {category}</>}
                      {filtering && (
                        <button type="button" onClick={() => set({ q: '', category: '', type: '' })}
                          style={{ marginLeft: '.6rem', font: 'inherit', fontSize: '.72rem', color: 'var(--color-navy)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>
                          Clear filters
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  {/* The format list lives in the rail on desktop; the rail folds away below 1024px. */}
                  <select className="lib-select lib-type-sel" value={type} onChange={(e) => set({ type: e.target.value })} aria-label="Format">
                    <option value="">All formats</option>
                    {(facets?.types || []).map((t) => <option key={t.name} value={t.name}>{TYPE_LABEL[t.name] || t.name}</option>)}
                  </select>
                  <select className="lib-select" value={sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort by">
                    {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="lib-grid">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i}><div className="sk" style={{ aspectRatio: '3 / 4', borderRadius: 10 }} /><div className="sk sk-line" style={{ marginTop: 12 }} /></div>
                  ))}
                </div>
              ) : isEmptyLibrary ? (
                <div className="lib-grid">
                  {SAMPLES.map((item) => <BookCard key={item._id} item={item} sample />)}
                </div>
              ) : result.items.length === 0 ? (
                <div className="lib-empty">
                  <Icon name="library" size="xl" />
                  <h4>Nothing matches that yet</h4>
                  <p style={{ fontSize: '.8rem' }}>Try a broader search, or clear the filters.</p>
                </div>
              ) : (
                <div className="lib-grid">
                  {result.items.map((item) => <BookCard key={item._id} item={item} progress={progress[item._id]} />)}
                </div>
              )}

              {!loading && result.pages > 1 && (
                <Pager page={page} pages={result.pages} onChange={(p) => { set({ page: String(p) }); document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' }); }} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
          <div className="ctaw">
            {user ? (
              <>
                <h2>Pick up where you <em>left off</em></h2>
                <p>Your shelf keeps what you are reading, what you have saved and the CPD hours from what you have finished.</p>
                <div className="ctarow">
                  <Link to="/portal/library" className="btn bg">Open My Shelf</Link>
                </div>
              </>
            ) : (
              <>
                <h2>Members read <em>everything</em></h2>
                <p>Sign in with your NIQS membership to open members-only titles, track your reading and log CPD hours as you finish.</p>
                <div className="ctarow">
                  <Link to="/login?next=%2Flibrary" className="btn bg">Member Sign In</Link>
                  <Link to="/membership" className="btn bo" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>Become a Member</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ n, l }) {
  return (
    <div className="lib-stat">
      <div className="lib-stat-n">{n ?? '—'}</div>
      <div className="lib-stat-l">{l}</div>
    </div>
  );
}

function Facet({ label, count, on, onClick }) {
  return (
    <button type="button" className={`lib-facet ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on}>
      <span>{label}</span>
      {count != null && <span className="lib-facet-n">{count}</span>}
    </button>
  );
}

function Pager({ page, pages, onChange }) {
  const nums = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) nums.push(p);
  return (
    <nav className="lib-pager" aria-label="Pages">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">‹</button>
      {nums[0] > 1 && <><button onClick={() => onChange(1)}>1</button>{nums[0] > 2 && <span style={{ alignSelf: 'center' }}>…</span>}</>}
      {nums.map((p) => <button key={p} className={p === page ? 'on' : ''} onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined}>{p}</button>)}
      {nums[nums.length - 1] < pages && <>{nums[nums.length - 1] < pages - 1 && <span style={{ alignSelf: 'center' }}>…</span>}<button onClick={() => onChange(pages)}>{pages}</button></>}
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">›</button>
    </nav>
  );
}
