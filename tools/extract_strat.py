"""Heath (KVELD) from the Stratocaster plans: sheet geometry into model space.

  /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 tools/extract_strat.py

Sources (electricherald.com, free templates, reference/strat/):
  Strat-Body-Front.pdf / Strat-Body-Back.pdf   1:1 body, routes, contour lines.
      Its outline matches the 1962 Fender drawing (Fender-Stratocaster-62.pdf):
      12 11/16 in wide, 1/2 in edge radius, 5/8 in left at the contoured edges.
  Stratocaster-Guitar-Plan-01.pdf              1:1 assembled guitar, in mm:
      frets (to fix the nut and the saddle line), pickups, knobs, guard, jack.

Model frame, inches: X along the strings, 0 at the saddle line, +X toward the
headstock. Y across, +Y bass. Z up, 0 the top of the body.

The two sheets are tied together by the neck: a Fender 21-fret neck is 18.38 in
from nut to butt (the Telecaster drawing), so the saddle line sits 7.12 in
behind the pocket floor. Checked on the assembled sheet, where the frets give
the nut and the saddles directly: the neck and middle pickups land within
0.015 in of the routes on the body sheet.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from plan_kit import *  # noqa: E402,F401

REF = os.path.join(ROOT, 'reference', 'strat')
SCALE = 25.5
NECK_LEN = 18.380785583333328          # Fender 21-fret neck, nut face to butt (tele.json)

# ------------------------------------------------------- body sheet ----
front = strokes(os.path.join(REF, 'svg', 'Strat-Body-Front.svg'))
FL = loops_of(front)
CL_Y = 8.312                            # the drawn centreline
POCKET_END = 15.839                     # pocket floor end: the two 0.25 R corner circles at x 16.089
SADDLE_X = POCKET_END - (SCALE - NECK_LEN)              # 8.719: the nut is a neck length past the pocket floor


def fxy(x, y):
    return (round(x - SADDLE_X, 4), round(CL_Y - y, 4))


# The outline is one long stroke, open only along the straight lower edge of
# the tongue round the pocket (y 9.4, x 16.84 to 18.58): close it there.
body_run = max(front, key=len)
raw = resample(body_run, 0.04, closed=True)
body_strokes = [s for s in front if all(2.4 < x < 21.6 and 1.3 < y < 15.3 for x, y in s)]
body = [fxy(*p) for p in raw]

# forearm contour: the two straight lines from the tail to the bass edge.
# The inner one (further from the corner) is where the top starts to fall.
lines = sorted([l for l in FL if not l['closed'] and len(l['pts']) <= 4 and l['length'] > 8 and l['bbox'][0] < 3.2 and l['bbox'][3] - l['bbox'][1] > 1],
               key=lambda l: l['bbox'][3])
arm = dict(outer=[fxy(*lines[0]['pts'][0]), fxy(*lines[0]['pts'][-1])],
           inner=[fxy(*lines[1]['pts'][0]), fxy(*lines[1]['pts'][-1])])

# routes: pickup centres from the rounded route ends (0.81 x 0.41 half-rounds)
ends = [l for l in FL if not l['closed'] and abs(l['length'] - 1.277) < 0.01]
route = {}
for l in ends:
    cx, cy = centre(l)
    route.setdefault(round(cx, 1), []).append((cx, cy))
pivot_x = [l for l in FL if not l['closed'] and l['length'] > 2.3 and l['bbox'][2] - l['bbox'][0] < 0.001 and 8 < l['bbox'][0] < 10][0]['bbox'][0]

# ------------------------------------------------------- back sheet ----
back = strokes(os.path.join(REF, 'svg', 'Strat-Body-Back.svg'))
BL = loops_of(back)
BACK_CL = 8.376
BACK_DX = 3.015 - 3.012                 # the back outline sits 0.003 right of the front one


def bxy(x, y):
    # seen from behind, so the bass side is at the bottom of the sheet
    return (round(x - BACK_DX - SADDLE_X, 4), round(y - BACK_CL, 4))


belly_loop = max((l for l in BL if not l['closed']), key=lambda l: l['bbox'][2] - l['bbox'][0] if l['bbox'][3] - l['bbox'][1] > 2 else 0)
belly = [bxy(*p) for p in resample(belly_loop['pts'], 0.1, closed=False)]

# ---------------------------------------------------- assembled sheet ----
asm = strokes(os.path.join(REF, 'svg', 'Stratocaster-Guitar-Plan-01.svg'))
AL = loops_of([s for s in asm if all(5 < x < 20 and 33 < y < 56 for x, y in s)])
# frets are drawn as wire pairs: fret 1 at 23.6255, fret 21 at 40.111 -> nut 22.195
fret_ys = {}
for s in asm:
    if len(s) == 2 and abs(s[0][1] - s[1][1]) < 1e-4 and 10.8 < min(s[0][0], s[1][0]) and max(s[0][0], s[1][0]) < 13.7 and 23 < s[0][1] < 40.5:
        y = round(s[0][1], 3); fret_ys[y] = fret_ys.get(y, 0) + abs(s[0][0] - s[1][0])
ys = sorted(y for y, w in fret_ys.items() if w > 0.8)
pairs = [(a + b) / 2 for a, b in zip(ys[0::2], ys[1::2])]
nut = [p - SCALE * (1 - 2 ** (-(n + 1) / 12)) for n, p in enumerate(pairs)]
NUT_Y = sum(nut) / len(nut)
A_SADDLE = NUT_Y + SCALE
A_CL = 12.216                           # centre of the six saddles


def axy(x, y):
    return (round(A_SADDLE - y, 4), round(A_CL - x, 4))


screws = circles(AL, 0.197, 0.006)
pu_screws = sorted([axy(*c) for c in screws if c[1] < 47], key=lambda p: -p[0])
knobs = [axy(*centre(l)) for l in AL if l['closed'] and abs(dia(l) - 0.984) < 0.01]
knobs = sorted({(round(a, 3), round(b, 3)) for a, b in knobs}, key=lambda p: -p[0])
jack_plate = [l for l in AL if l['closed'] and abs(dia(l) - 2.683) < 0.02][0]
guard_runs = sorted([l for l in AL if not l['closed'] and l['length'] > 10 and l['bbox'][3] < 50.5], key=lambda l: -l['length'])

out = dict(
    units='inch', scale=SCALE, neck_length=NECK_LEN,
    sources=dict(body='Strat-Body-Front.pdf, Strat-Body-Back.pdf', assembled='Stratocaster-Guitar-Plan-01.pdf',
                 check='Fender-Stratocaster-62.pdf'),
    body_outline=body,
    neck_pocket=dict(x_floor=round(POCKET_END - SADDLE_X, 4), half_width=1.108, corner_r=0.25, depth=0.625),
    arm_contour=arm,
    belly_contour=belly,
    pivot_x=round(pivot_x - SADDLE_X, 4),
    pickup_routes={k: [fxy(*p) for p in v] for k, v in route.items()},
    pickup_screws=pu_screws,
    knobs=knobs,
    jack_plate=[axy(*p) for p in resample(jack_plate['pts'][:-1], 0.05)],
    guard_original=[[axy(*p) for p in resample(l['pts'], 0.05, closed=False)] for l in guard_runs[:4]],
    nut_check=dict(nut_y=round(NUT_Y, 4), spread=round(max(nut) - min(nut), 4)),
)
dst = os.path.join(REF, 'parsed', 'strat.json')
json.dump(out, open(dst, 'w'), indent=1)

bx = [p[0] for p in body]; by = [p[1] for p in body]
print(f'body {len(body)} pts  X {min(bx):.3f}..{max(bx):.3f} ({max(bx) - min(bx):.3f})  Y {min(by):.3f}..{max(by):.3f} ({max(by) - min(by):.3f})')
print('saddle line on the body sheet', round(SADDLE_X, 3), ' pivot screws at X', out['pivot_x'])
print('routes', out['pickup_routes'])
print('pickup screws', pu_screws)
print('knobs', knobs)
print('nut from frets', out['nut_check'])
print('arm', arm)
print('belly ends', belly[0], belly[-1], 'peak', min(belly, key=lambda p: p[1]))
print('guard runs', [len(g) for g in out['guard_original']])
plot(os.path.join(REF, 'parsed', 'strat_check.png'),
     [(body_strokes, (0.7, 0.7, 0.7), 1), ([raw + raw[:1]], (0.9, 0.2, 0.1), 2)], (2.5, 1.5, 21.6, 15.2), ppi=40)
