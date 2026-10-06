"""Fjord (KVELD) from the ES-335 plans: sheet geometry into model space.

  /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 tools/extract_335.py

Source (electricherald.com, free templates, reference/es335/):
  Gibson-335-Dot-Complete.pdf   1:1, inches (P. Sharkey, CC BY-NC-SA). Body with
      its binding, f-holes, pickups, slanted bridge posts, stopbar studs, knobs;
      a side section (1 3/4 in rim, neck pitched 4 degrees, head 17 degrees);
      and a contour map of the arched top: nine lines from 0.050 to 0.450 in
      above the rim, drawn on one half.

The frets give the scale: 24.55 in on this sheet (fret 1 to 2 is 1.300 in, the
12th sits 12.27 in from the nut), not the nominal 24.75. The drawing wins.

Model frame: X along the strings from the saddle line (+ to the headstock),
Y across (+ bass), inches. On the sheet the neck points right and the bass side
is at the top.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from plan_kit import *  # noqa: E402,F401

REF = os.path.join(ROOT, 'reference', 'es335')
S = strokes(os.path.join(REF, 'svg', 'Gibson-335-Dot-Complete.svg'))
L = sorted(loops_of(S), key=lambda l: -l['length'])
CL = 10.0

# ------------------------------------------------------------- the scale ----
xs = {}
for s in S:
    for a, b in zip(s, s[1:]):
        if abs(a[0] - b[0]) < 2e-3 and 1.4 < abs(a[1] - b[1]) < 2.4 and 20 < a[0] < 36 and 8.5 < min(a[1], b[1]) < 9.5:
            xs[round(a[0], 3)] = 1
frets = sorted((x for x in xs if x < 35.0), reverse=True)[:18]   # fret 1 (34.525) down to 18
NUT = 35.903                                                 # the line before fret 1
# least squares for the scale with the nut fixed
num = sum((NUT - f) * (1 - 2 ** (-(n + 1) / 12)) for n, f in enumerate(frets))
den = sum((1 - 2 ** (-(n + 1) / 12)) ** 2 for n, f in enumerate(frets))
SCALE = num / den
SAD = NUT - SCALE


def mxy(x, y):
    return (round(x - SAD, 4), round(CL - y, 4))


# ----------------------------------------------------------- the outline ----
halves = [l['pts'] for l in L[12:14]]
box = (1.0, 1.7, 20.7, 18.3)
raw = outline(halves, box, open_r=3)
body = [mxy(*p) for p in raw]

# ----------------------------------------------------------- the arch map ----
# drawn as one half below the main view: its straight edge is the centreline
amap = L[5]
ab = amap['bbox']
AM_CL = ab[1]                                                # y 23.99
AM_X0 = ab[0]
levels = [0.050, 0.100, 0.150, 0.200, 0.250, 0.300, 0.350, 0.400, 0.450]
cont = sorted([l for l in L if not l['closed'] and abs(l['bbox'][1] - AM_CL) < 0.03 and l['bbox'][3] < ab[3] - 0.1 and l['bbox'][2] - l['bbox'][0] > 1],
              key=lambda l: -(l['bbox'][2] - l['bbox'][0]))
# the map's own outline lines up with the body's tail and length
body_x0 = min(p[0] for p in raw)
DXM = body_x0 - AM_X0


def map_xy(x, y):
    return (round(x + DXM - SAD, 4), round(-(y - AM_CL), 4))      # the drawn half is the treble half (below the line)


arch = []
for lev, l in zip(levels, cont[:9]):
    half = [map_xy(*p) for p in resample(l['pts'], 0.05, closed=False)]
    # close it by mirroring onto the bass half
    loop = half + [(x, -y) for x, y in half[::-1]]
    arch.append(dict(h=lev, loop=[[round(a, 4), round(b, 4)] for a, b in loop]))

# ------------------------------------------------------------- hardware ----
LS = loops_of([s for s in S if all(1 < x < 21 and 1.5 < y < 18.5 for x, y in s)])
posts = sorted([mxy(*c) for c in circles(LS, 0.11, 0.006) if c[0] < 12], key=lambda p: -p[1])
studs = sorted([mxy(*c) for c in circles(LS, 0.437, 0.004) if abs(c[1] - CL) < 2], key=lambda p: -p[1])
knobs = [mxy(*c) for c in circles(LS, 0.343, 0.004)]
jack = mxy(*circles(LS, 0.373, 0.006)[0])
rings = sorted([centre(l) for l in LS if l['closed'] and abs(l['bbox'][2] - l['bbox'][0] - 1.778) < 0.01 and abs(l['bbox'][3] - l['bbox'][1] - 3.527) < 0.01])
fholes = [[mxy(*p) for p in resample(L[k]['pts'], 0.05)] for k in (37, 38)]
guard = [mxy(*p) for p in resample(L[20]['pts'], 0.05)]

out = dict(
    units='inch', scale=round(SCALE, 4), sources=dict(all='Gibson-335-Dot-Complete.pdf'),
    body_outline=body, neck_joint_x=round(max(p[0] for p in body if abs(p[1]) < 1.0), 4), rim=1.75,
    arch=arch, pickups=[mxy(*c) for c in rings], tom_posts=posts, stop_studs=studs, knobs=knobs, jack=jack,
    fholes_original=fholes, guard_original=guard, neck_pitch_deg=4.0, head_pitch_deg=17.0,
)
json.dump(out, open(os.path.join(REF, 'parsed', '335.json'), 'w'), indent=1)
bx = [p[0] for p in body]; by = [p[1] for p in body]
print(f'scale {SCALE:.4f} from {len(frets)} frets, saddle x {SAD:.3f}')
print(f'body {len(body)} pts X {min(bx):.3f}..{max(bx):.3f} ({max(bx) - min(bx):.3f})  Y {min(by):.3f}..{max(by):.3f} ({max(by) - min(by):.3f})')
print('joint', out['neck_joint_x'], 'pickups', out['pickups'])
print('posts', posts, 'studs', studs)
print('knobs', knobs, 'jack', jack)
print('arch levels', [(a['h'], len(a['loop']), min(p[0] for p in a['loop']), max(p[0] for p in a['loop'])) for a in arch])
plot(os.path.join(REF, 'parsed', '335_check.png'),
     [([[(p[0], -p[1]) for p in body + body[:1]]], (0.9, 0.2, 0.1), 2)]
     + [([[(p[0], -p[1]) for p in a['loop']]], (0.1, 0.3, 0.9), 1) for a in arch]
     + [([[(p[0], -p[1]) for p in f]], (0.1, 0.6, 0.2), 1) for f in fholes], (-11, -9, 10, 9), ppi=35)
