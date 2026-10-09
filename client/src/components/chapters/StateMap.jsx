import { STATES, PROJECTION } from '../../data/nigeriaStates';
import { STATE_CAPITALS } from '../../data/stateCapitals';
import { normaliseState } from './ChapterMap';

/**
 * The chapter's own state, drawn alone and filling the frame, with a pin on
 * the chapter secretariat — the picture on a chapter page.
 *
 * Round 1 (Oct 2026) showed the whole of Nigeria with the state picked out;
 * NIQS then asked for the state on its own, with the headquarters marked, so a
 * visitor sees where the chapter actually sits. Same Natural Earth geometry as
 * ChapterMap: the viewBox is simply cropped to the state's bounds.
 *
 * The pin is the chapter's own pinLat/pinLng when the Secretariat has set them
 * in admin, otherwise the state capital (data/stateCapitals.js), which is where
 * chapter secretariats normally are. Every capital is checked to fall inside
 * its state's outline.
 *
 * Renders nothing if the state cannot be matched, rather than an empty frame.
 */

const project = (lat, lng) => [
  (lng - PROJECTION.minLon) * PROJECTION.kx * PROJECTION.scale + PROJECTION.pad,
  (PROJECTION.maxLat - lat) * PROJECTION.scale + PROJECTION.pad,
];

function bounds(d) {
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]);
    y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]);
  }
  return { x0, y0, x1, y1 };
}

export default function StateMap({ state, zone, pin }) {
  const name = normaliseState(state);
  const target = STATES.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (!target) return null;

  const label = target.name === 'FCT' ? 'Federal Capital Territory' : `${target.name} State`;
  const capital = STATE_CAPITALS[target.name];
  const hasOwnPin = Number.isFinite(pin?.lat) && Number.isFinite(pin?.lng);
  const where = hasOwnPin ? pin : capital;
  const place = (hasOwnPin && pin.label) || capital?.city;

  // Crop to the state with a margin, and keep the frame from going too
  // narrow for long thin states (Kogi, Niger) so the card height stays sane.
  const b = bounds(target.d);
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  const m = Math.max(w, h) * 0.08;
  const vw = Math.max(w, h * 0.8) + 2 * m;
  const vh = Math.max(h, w * 0.6) + 2 * m;
  const vx = b.x0 + w / 2 - vw / 2, vy = b.y0 + h / 2 - vh / 2;

  // The pin is sized to the frame, so it reads the same on Lagos and Borno.
  const s = Math.max(vw, vh) / 22;
  const pt = where ? project(where.lat, where.lng) : null;

  return (
    <figure className="smap">
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} role="img"
        aria-label={`Map of ${label}${place ? `, with the chapter secretariat in ${place} marked` : ''}`}>
        <path className="smap-state" d={target.d} vectorEffect="non-scaling-stroke" />
        {pt && (
          <g className="smap-pin" transform={`translate(${pt[0]} ${pt[1]})`}>
            <circle className="smap-pin-pulse" r={s * 0.9} />
            <path d={`M0 0 C ${-s * 0.35} ${-s * 0.6} ${-s * 0.75} ${-s * 0.95} ${-s * 0.75} ${-s * 1.45}
                      A ${s * 0.75} ${s * 0.75} 0 1 1 ${s * 0.75} ${-s * 1.45}
                      C ${s * 0.75} ${-s * 0.95} ${s * 0.35} ${-s * 0.6} 0 0 Z`}
              vectorEffect="non-scaling-stroke" />
            <circle className="smap-pin-eye" cy={-s * 1.45} r={s * 0.3} />
          </g>
        )}
      </svg>
      <figcaption>
        <span className="smap-dot" aria-hidden="true" />
        <strong>{label}</strong>
        {zone && <span> — {zone} Zone</span>}
        {place && <span className="smap-place">Chapter Secretariat, {place}</span>}
      </figcaption>
    </figure>
  );
}
