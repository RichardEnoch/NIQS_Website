import { Link } from 'react-router-dom';
import BookCover from './BookCover';
import { TYPE_LABEL } from '../../api/libraryApi';

export default function BookCard({ item, progress, sample = false }) {
  const by = item.authors?.length ? item.authors.join(', ') : item.publisher;
  const body = (
    <>
      <BookCover item={item} sample={sample} />
      <div className="lib-card-meta">
        <div className="lib-card-type">{TYPE_LABEL[item.type] || 'Resource'}{item.year ? ` · ${item.year}` : ''}</div>
        <div className="lib-card-title">{item.title}</div>
        {by && <div className="lib-card-by">{by}</div>}
        {progress != null && (
          <div className="lib-prog" title={`${progress}% read`}><span style={{ width: `${progress}%` }} /></div>
        )}
      </div>
    </>
  );
  // Sample cards have no page behind them.
  if (sample) return <div className="lib-card">{body}</div>;
  return <Link to={`/library/${item.slug}`} className="lib-card">{body}</Link>;
}
