import { STATES, VIEWBOX } from '../../data/nigeriaStates';
import { normaliseState } from './ChapterMap';

/**
 * Nigeria with one state picked out — the picture on a chapter page.
 *
 * It replaced the chairman's portrait in that slot (review, Oct 2026): the
 * portrait already appears in the executive list below, and a map says what
 * the page is about at a glance. Same Natural Earth geometry as ChapterMap,
 * so no new data and no licence question.
 *
 * Renders nothing if the state cannot be matched, rather than a map with no
 * state highlighted, which would read as an error.
 */
export default function StateMap({ state, zone }) {
  const name = normaliseState(state);
  const target = STATES.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (!target) return null;

  const label = target.name === 'FCT' ? 'Federal Capital Territory' : `${target.name} State`;

  return (
    <figure className="smap">
      <svg viewBox={VIEWBOX} role="img" aria-label={`${label} highlighted on the map of Nigeria`}>
        <g className="smap-others">
          {STATES.filter(s => s !== target).map(s => <path key={s.name} d={s.d} />)}
        </g>
        <path className="smap-target" d={target.d} />
      </svg>
      <figcaption>
        <span className="smap-dot" aria-hidden="true" />
        <strong>{label}</strong>
        {zone && <span> — {zone} Zone</span>}
      </figcaption>
    </figure>
  );
}
