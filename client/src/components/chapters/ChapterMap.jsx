import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATES, VIEWBOX } from '../../data/nigeriaStates';

/**
 * Interactive map of Nigeria — every state is clickable and opens its chapter.
 *
 * Geometry comes from Natural Earth 1:10m Admin 1, which is public domain, via
 * client/scripts/build-nigeria-map.py. That mattered: GADM is licensed for
 * non-commercial use only and geoBoundaries is CC-BY, so both would have put a
 * licence obligation on the institute's site for a map. Drawing the borders by
 * hand was never an option — approximate borders on a national body's own
 * website would be worse than no map.
 *
 * ~11.5 KB brotli for all 37 states, and it lives on a lazy route, so the entry
 * bundle is untouched.
 */

const ZONE_CLASS = {
  'North West':   'z-nw',
  'North East':   'z-ne',
  'North Central':'z-nc',
  'South West':   'z-sw',
  'South East':   'z-se',
  'South South':  'z-ss',
};

/**
 * Chapter records store "Abia State"; the map data uses "Abia". FCT is bare in
 * both. Getting this wrong silently matched almost nothing the first time round.
 */
export function normaliseState(value) {
  return String(value || '')
    .replace(/\s+state$/i, '')
    .replace(/^federal capital territory$/i, 'FCT')
    .trim();
}

/**
 * A published profile, not merely a chapter record. Keyed on `about`, matching
 * the "Full profile" badge the list below already used — deliberately not
 * chairperson, which seedChapterExcos.js sets on every chapter as a stub and so
 * distinguishes nothing.
 */
function isProfiled(chapter) {
  return Boolean(chapter?.about);
}

/**
 * States too small to hold a label inside their own outline, and where their
 * label goes instead.
 *
 * The generated paths fill their viewBox edge to edge (x 8-992, y 8-806), so
 * there is no margin to write into. VIEWBOX_PADDED widens the canvas around the
 * unchanged geometry — the country is not rescaled, the frame simply gets bigger
 * — and these anchors sit in that new space.
 *
 * Positions are hand-placed rather than derived. An algorithm that pushes each
 * label to its nearest edge puts eight of the south-eastern states on the same
 * short stretch of the bottom border, which is worse than useless. Grouping them
 * — west coast to the left, delta along the bottom, the south-east fanned into
 * the empty bottom-right, and the landlocked ones out to the right — keeps every
 * line readable and unambiguous about which shape it points at.
 *
 * anchor is the SVG text-anchor, so labels read outward from the map on each side.
 */
const VIEWBOX_PADDED = '-215 0 1425 915';

const LEADERS = {
  /* West coast — short hops to the left margin. */
  Ekiti:        { x: -22,  y: 470, anchor: 'end' },
  Osun:         { x: -22,  y: 540, anchor: 'end' },
  Lagos:        { x: -22,  y: 612, anchor: 'end' },

  /* Niger delta — straight down into the bottom margin. */
  Bayelsa:      { x: 150,  y: 884, anchor: 'middle' },
  Rivers:       { x: 330,  y: 884, anchor: 'middle' },

  /* South-east, fanned into the empty corner beyond Cross River. */
  Imo:          { x: 615,  y: 884, anchor: 'middle' },
  Abia:         { x: 760,  y: 884, anchor: 'middle' },
  'Akwa Ibom':  { x: 920,  y: 884, anchor: 'middle' },

  /* Landlocked — out to the right margin at roughly their own latitude. */
  FCT:          { x: 1015, y: 424, anchor: 'start' },
  Enugu:        { x: 1015, y: 608, anchor: 'start' },
  Anambra:      { x: 1015, y: 668, anchor: 'start' },
  Ebonyi:       { x: 1015, y: 728, anchor: 'start' },
};

const TINY = new Set(Object.keys(LEADERS));

export default function ChapterMap({ chapters = [], activeZone, onZoneChange }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  const byState = useMemo(() => {
    const m = new Map();
    chapters.forEach((c) => {
      const key = normaliseState(c.state) || normaliseState(String(c.name).replace(/\s+chapter$/i, ''));
      if (key) m.set(key, c);
    });
    return m;
  }, [chapters]);

  const zones = useMemo(() => {
    const set = new Set();
    chapters.forEach((c) => c.zone && set.add(c.zone));
    return [...set].sort();
  }, [chapters]);

  const go = (slug) => navigate(`/chapters/${slug}`);

  return (
    <div className="cmap-wrap">
      <div className="cmap-head">
        <div>
          <div className="ey">Nationwide</div>
          <h2 className="sh" style={{ marginBottom: '.4rem' }}>
            All 37 <em>Chapters</em>
          </h2>
          {/* No completeness statistic here. It read as "17 chapters have not
              bothered", which is not what an incremental rollout means and not
              something the institute should publish about itself (secretariat,
              2026-08-05). The map still distinguishes the two states of a chapter
              so the page navigates sensibly — it just does not score them. */}
          <p className="sd" style={{ marginBottom: 0 }}>
            Select any state to open its chapter.
          </p>
        </div>

        {zones.length > 1 && (
          <div className="cmap-legend" role="group" aria-label="Filter chapters by geopolitical zone">
            <button
              type="button"
              className={`cmap-zone${!activeZone ? ' on' : ''}`}
              onClick={() => onZoneChange?.(null)}
              aria-pressed={!activeZone}
            >
              All zones
            </button>
            {zones.map((z) => (
              <button
                key={z}
                type="button"
                className={`cmap-zone ${ZONE_CLASS[z] || ''}${activeZone === z ? ' on' : ''}`}
                onClick={() => onZoneChange?.(activeZone === z ? null : z)}
                aria-pressed={activeZone === z}
              >
                <span className="cmap-swatch" aria-hidden="true" />
                {z}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="cmap-figure">
        <svg
          viewBox={VIEWBOX_PADDED}
          className="cmap-svg"
          role="list"
          aria-label="Map of Nigeria. Each state links to its NIQS chapter."
        >
          {STATES.map((s) => {
            const chapter  = byState.get(s.name);
            const profiled = isProfiled(chapter);
            const zone     = chapter?.zone;
            const dimmed   = activeZone && zone !== activeZone;
            const slug     = chapter?.slug || `${s.name.toLowerCase().replace(/\s+/g, '-')}-chapter`;

            return (
              <g key={s.name} role="listitem">
                {/* SVG <a> is a real link: right-click, middle-click and
                    "copy link address" all behave. onClick is intercepted so
                    navigation stays client-side. */}
                <a
                  href={`/chapters/${slug}`}
                  onClick={(e) => { e.preventDefault(); go(slug); }}
                  onMouseEnter={() => setHovered(s.name)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(s.name)}
                  onBlur={() => setHovered(null)}
                  aria-label={`${s.name} chapter${zone ? `, ${zone} zone` : ''}`}
                >
                  <path
                    d={s.d}
                    className={[
                      'cmap-state',
                      ZONE_CLASS[zone] || '',
                      profiled ? 'is-profiled' : 'is-pending',
                      dimmed ? 'is-dimmed' : '',
                    ].filter(Boolean).join(' ')}
                  />
                </a>
              </g>
            );
          })}

          {/* Leader lines for the states too small to label in place. Drawn
              before the labels but after every shape, so a line never disappears
              under a neighbouring state. All of it is pointer-events: none —
              a line lying across Taraba must not intercept Taraba's click. */}
          {STATES.map((s) => {
            const lead = LEADERS[s.name];
            if (!lead) return null;
            const chapter = byState.get(s.name);
            const dimmed  = activeZone && chapter?.zone !== activeZone;
            const cls = `cmap-leader${dimmed ? ' is-dimmed' : ''}${hovered === s.name ? ' is-hover' : ''}`;
            return (
              <g key={`l-${s.name}`} className={cls} aria-hidden="true">
                <line x1={s.cx} y1={s.cy} x2={lead.x} y2={lead.y} />
                {/* Anchor dot sits on the state, so it is unambiguous which
                    shape the line belongs to where several run in parallel. */}
                <circle cx={s.cx} cy={s.cy} r="3.5" />
              </g>
            );
          })}

          {/* Labels last, so nothing paints over them. pointer-events none keeps
              a label from stealing the click from the state underneath it. */}
          {STATES.map((s) => {
            const chapter = byState.get(s.name);
            const dimmed  = activeZone && chapter?.zone !== activeZone;
            const lead    = LEADERS[s.name];
            const hover   = hovered === s.name;
            return (
              <text
                key={`t-${s.name}`}
                x={lead ? lead.x : s.cx}
                y={lead ? lead.y : s.cy}
                className={[
                  'cmap-label',
                  lead ? 'is-leader' : '',
                  dimmed ? 'is-dimmed' : '',
                  hover ? 'is-hover' : '',
                ].filter(Boolean).join(' ')}
                textAnchor={lead ? lead.anchor : 'middle'}
                dominantBaseline={lead ? 'middle' : 'auto'}
                aria-hidden="true"
              >
                {s.name}
              </text>
            );
          })}
        </svg>
      </div>

      <p className="cmap-note">
        <span className="cmap-key"><span className="cmap-dot" aria-hidden="true" /> executives published</span>
        <span className="cmap-key"><span className="cmap-dash" aria-hidden="true" /> chapter listed</span>
        {hovered && <span className="cmap-hovered">{hovered}</span>}
      </p>
    </div>
  );
}
