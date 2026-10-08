import Icon from '../common/Icon';
import { TYPE_LABEL } from '../../api/libraryApi';

/**
 * A library cover. Uses the uploaded cover when there is one; otherwise draws a
 * navy-and-gold cover from the title, so a catalogue of items nobody has found
 * artwork for still looks like the Institute's shelf rather than a row of grey
 * placeholders.
 */
export default function BookCover({ item, showBadge = true, sample = false }) {
  const locked = item.access === 'members';
  return (
    <div className="lib-cover">
      {item.coverImage ? (
        <img src={item.coverImage} alt={item.title} loading="lazy" />
      ) : (
        <div className="lib-cover-art" aria-hidden="true">
          <div className="lca-type">{TYPE_LABEL[item.type] || 'Resource'}</div>
          <div>
            <div className="lca-rule" />
            <div className="lca-title">{item.title}</div>
          </div>
          <div className="lca-foot">
            <img src="/brand/emblem-dark.png" alt="" />
            <span>NIQS</span>
          </div>
        </div>
      )}
      {showBadge && (
        locked
          ? <span className="lib-badge"><Icon name="lock" size={12} /> Members</span>
          : <span className="lib-badge free">Free</span>
      )}
      {sample && <span className="lib-badge sample">Sample</span>}
    </div>
  );
}
