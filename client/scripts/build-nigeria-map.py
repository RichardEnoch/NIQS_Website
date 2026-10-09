"""
Generates client/src/data/nigeriaStates.js — SVG path data for Nigeria's 36
states and the FCT.

  python client/scripts/build-nigeria-map.py <path-to-ne_10m_admin_1.geojson>

Source
------
Natural Earth 1:10m Admin 1 – States, Provinces.
https://github.com/nvkelso/natural-earth-vector (geojson/ne_10m_admin_1_states_provinces.geojson)

Natural Earth is in the **public domain**: "you may use the maps in any manner,
including modifying the content and design, electronic dissemination, and offset
printing" with no attribution required. That is why this source was chosen over
GADM (non-commercial licence only) or geoBoundaries (CC-BY, attribution
required) — a professional institute's public site should not carry a licence
obligation for a decorative map.

The upstream file is ~40 MB and is deliberately NOT committed. Download it, run
this once, and commit the generated module.

What it does
------------
1. Filters the 4,596 worldwide features down to Nigeria's 37.
2. Projects lon/lat to SVG space. Equirectangular with a cos(mean latitude)
   correction on x — Nigeria spans ~4.2-13.9°N, where the distortion of a
   proper conic projection versus this is well under a pixel at display size.
3. Simplifies each ring with Ramer-Douglas-Peucker. This is the whole game for
   file size: the raw geometry is ~6,500 points, and unsimplified it would cost
   more than the entire route-split saving from the performance work.
4. Emits rounded path data plus a label anchor per state.

Simplification is per-ring, so a shared border is simplified twice and can
disagree with itself. At the tolerance used here the disagreement is sub-pixel at
the rendered size; the alternative is topology-aware simplification, which needs
topojson and is not worth a dependency for a map this small.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'src', 'data', 'nigeriaStates.js'))

# Viewport the paths are generated against. The component scales via viewBox.
WIDTH = 1000.0
PADDING = 8.0

# Chosen by sweeping tolerance against brotli size of the generated module:
#   0.40 -> 12.9 KB   0.55 -> 11.5 KB   0.80 -> 10.0 KB   1.20 -> 8.2 KB
# The budget for this map was ~30 KB, so every option fits and fidelity wins.
# 0.55 keeps the error below a pixel at the ~700px the map actually renders at.
TOLERANCE = 0.55  # SVG units; ~0.4px at the rendered width, i.e. sub-pixel
PRECISION = 1      # decimal places in path data

# Natural Earth's spellings differ from the chapter records in two places.
RENAME = {
    'Federal Capital Territory': 'FCT',
    'Nassarawa': 'Nasarawa',
}


def perpendicular_distance(pt, start, end):
    if start == end:
        return math.dist(pt, start)
    x0, y0 = pt
    x1, y1 = start
    x2, y2 = end
    num = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1)
    den = math.hypot(y2 - y1, x2 - x1)
    return num / den


def rdp(points, epsilon):
    """Ramer-Douglas-Peucker, iterative so a long coastline cannot blow the stack."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        if last <= first + 1:
            continue
        dmax, index = 0.0, first
        for i in range(first + 1, last):
            d = perpendicular_distance(points[i], points[first], points[last])
            if d > dmax:
                dmax, index = d, i
        if dmax > epsilon:
            keep[index] = True
            stack.append((first, index))
            stack.append((index, last))
    return [p for p, k in zip(points, keep) if k]


def rings_of(geom):
    if geom['type'] == 'Polygon':
        return [geom['coordinates'][0]]                    # outer ring only
    return [poly[0] for poly in geom['coordinates']]        # MultiPolygon


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__.strip().splitlines()[2])
    data = json.load(open(sys.argv[1], encoding='utf-8'))

    feats = [f for f in data['features']
             if str(f['properties'].get('admin', '')).lower() == 'nigeria'
             or str(f['properties'].get('adm0_a3', '')).upper() == 'NGA']
    if not feats:
        raise SystemExit('no Nigerian features found in that file')

    def name_of(f):
        p = f['properties']
        raw = p.get('name') or p.get('name_en') or p.get('woe_name') or '?'
        return RENAME.get(raw, raw)

    # Bounds across every ring, so the projection frames the whole country.
    lons = [c[0] for f in feats for r in rings_of(f['geometry']) for c in r]
    lats = [c[1] for f in feats for r in rings_of(f['geometry']) for c in r]
    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)

    kx = math.cos(math.radians((min_lat + max_lat) / 2))
    span_x = (max_lon - min_lon) * kx
    span_y = max_lat - min_lat
    scale = (WIDTH - 2 * PADDING) / span_x
    height = span_y * scale + 2 * PADDING

    def project(lon, lat):
        return ((lon - min_lon) * kx * scale + PADDING,
                (max_lat - lat) * scale + PADDING)

    states, raw_pts, kept_pts = [], 0, 0
    for f in sorted(feats, key=name_of):
        parts = []
        all_pts = []
        for ring in rings_of(f['geometry']):
            pts = [project(lon, lat) for lon, lat in ring]
            raw_pts += len(pts)
            simple = rdp(pts, TOLERANCE)
            if len(simple) < 4:            # a sliver island simplified away
                continue
            kept_pts += len(simple)
            all_pts.extend(simple)
            d = 'M' + 'L'.join(f'{x:.{PRECISION}f} {y:.{PRECISION}f}' for x, y in simple) + 'Z'
            parts.append(d)
        if not parts:
            continue
        # Label anchor: centroid of the largest ring, not of all rings, so an
        # offshore island does not drag Lagos' label into the Atlantic.
        big = max(rings_of(f['geometry']), key=len)
        bp = [project(lon, lat) for lon, lat in big]
        cx = sum(p[0] for p in bp) / len(bp)
        cy = sum(p[1] for p in bp) / len(bp)
        states.append({'name': name_of(f), 'd': ''.join(parts),
                       'cx': round(cx, 1), 'cy': round(cy, 1)})

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('/**\n')
        fh.write(' * Nigeria state boundaries as SVG paths — GENERATED, do not hand-edit.\n')
        fh.write(' *\n')
        fh.write(' * Source: Natural Earth 1:10m Admin 1 (public domain, no attribution\n')
        fh.write(' * required). Regenerate with client/scripts/build-nigeria-map.py, which\n')
        fh.write(' * documents the projection and simplification.\n')
        fh.write(' */\n')
        fh.write(f'export const VIEWBOX = "0 0 {WIDTH:.0f} {height:.0f}";\n\n')
        # The projection itself, so a lon/lat (a chapter secretariat's pin)
        # lands on these paths. Same formula as project() above.
        fh.write('export const PROJECTION = '
                 f'{{ minLon: {min_lon!r}, maxLat: {max_lat!r}, kx: {kx!r}, scale: {scale!r}, pad: {PADDING!r} }};\n\n')
        fh.write('export const STATES = [\n')
        for s in states:
            fh.write(f'  {{ name: {json.dumps(s["name"])}, cx: {s["cx"]}, cy: {s["cy"]},\n')
            fh.write(f'    d: {json.dumps(s["d"])} }},\n')
        fh.write('];\n')

    size = os.path.getsize(OUT)
    print(f'  states written   : {len(states)}')
    print(f'  points           : {raw_pts:,} -> {kept_pts:,} '
          f'({100 * (raw_pts - kept_pts) / raw_pts:.0f}% removed, tolerance {TOLERANCE})')
    print(f'  viewBox          : 0 0 {WIDTH:.0f} {height:.0f}')
    print(f'  generated module : {size / 1024:.1f} KB raw')
    missing = {'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
               'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
               'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
               'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
               'Yobe','Zamfara'} - {s['name'] for s in states}
    print(f'  expected states missing: {sorted(missing) or "none"}')


if __name__ == '__main__':
    main()
