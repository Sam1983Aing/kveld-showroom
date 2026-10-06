"""Moss (KVELD) from the Jazzmaster plans: sheet geometry into model space.

  /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 tools/extract_jm.py

Source (electricherald.com, free templates, reference/jazzmaster/):
  Fender-Jazzmaster-Body-Route-Pickguard.pdf   1:1 body with its routes, and the
      guard drawn above it. 13 13/16 x 19 3/16 in, as the '62 sheet dimensions it
      (Fender-Jazzmaster-62-Body.pdf, used as the check).

Model frame as for the others: X along the strings from the saddle line (+ to
the headstock), Y across (+ bass), inches. The sheet has the neck up and the
bass side on the left (the rhythm circuit route sits in the upper bass horn).

Tie between body and strings, as for Heath: a Fender 21-fret neck is 18.38 in
from nut to butt, so the saddle line is 7.12 in behind the pocket floor. It
lands on the two bridge post holes, 0.006 in off: an independent check that
the sheet and the neck agree.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from plan_kit import *  # noqa: E402,F401

REF = os.path.join(ROOT, 'reference', 'jazzmaster')
SCALE = 25.5
NECK_LEN = 18.380785583333328

S = strokes(os.path.join(REF, 'svg', 'Fender-Jazzmaster-Body-Route-Pickguard.svg'))
L = sorted(loops_of(S), key=lambda l: -l['length'])
body_run = L[0]['pts']
CL_X = 18.037                                   # pickups and neck screws are centred on it

# the outline runs down into the neck pocket and back: that notch is the pocket,
# not the body's edge. Take it out and close straight across its mouth.
pocket_pts = [p for p in body_run if 16.85 < p[0] < 19.3 and 24.8 < p[1] < 28.5]
POCKET_FLOOR = max(p[1] for p in pocket_pts)
POCKET_MOUTH = 24.886
pocket_half = (max(p[0] for p in pocket_pts if p[1] > 26) - min(p[0] for p in pocket_pts if p[1] > 26)) / 2
# Cut out exactly the pocket (its own width, either side of the centreline):
# a box a little wider on the treble side also took the body's real edge that
# runs alongside the neck there, and closing the gap drew a chord diagonally
# across the end of the body. The mouth line, traced twice, goes with it.
outline = [p for p in body_run if not (abs(p[0] - CL_X) < pocket_half - 0.02 and p[1] > POCKET_MOUTH - 0.03 and p[1] < 28.5)]
SADDLE_Y = POCKET_FLOOR + (SCALE - NECK_LEN)


def bxy(x, y):
    return (round(SADDLE_Y - y, 4), round(CL_X - x, 4))


# The outline now stops where the treble cutaway meets the pocket's treble wall
# and starts again at the bass corner of the mouth. On the sheet that wall is
# also the body's edge from there to the end of the body, and the mouth closes
# it: put both back, straight, as drawn.
a_, b_ = outline[-1], outline[0]
if b_[1] > a_[1]:                                   # (sheet y grows toward the tail)
    outline = outline[::-1]; a_, b_ = outline[-1], outline[0]
wall_x = a_[0]                                      # the pocket's treble wall, sheet x
outline += [(wall_x, a_[1] + (POCKET_MOUTH - a_[1]) * k / 20) for k in range(1, 21)]
outline += [(wall_x + (b_[0] - wall_x) * k / 20, POCKET_MOUTH) for k in range(1, 20)]
print('pocket edge: treble wall from', bxy(*a_), 'to', bxy(wall_x, POCKET_MOUTH), 'mouth to', bxy(*b_))
raw = resample(outline, 0.04, closed=True)
body = [bxy(*p) for p in raw]

# the guard is drawn above the body; its two bridge holes sit over the body's
guard_loop = L[1]
g_holes = circles(L, 0.535, 0.01)
b_holes = circles(L, 0.375, 0.01, within=(15, 30, 21, 40))
GDY = sorted(b_holes)[0][1] - sorted(g_holes)[0][1]


def gxy(x, y):
    return bxy(x, y + GDY)


guard = [gxy(*p) for p in resample(guard_loop['pts'], 0.05)]
cut = [l for l in L if l['closed'] and abs(l['bbox'][2] - l['bbox'][0] - 3.655) < 0.01]
pickups = sorted([gxy(*centre(l)) for l in cut], key=lambda p: -p[0])
cut_outlines = [[gxy(*p) for p in resample(l['pts'], 0.05)] for l in cut]
g_screws = [gxy(*c) for c in circles(L, 0.215, 0.01, within=(13, 4, 25, 19))]
lead = sorted([gxy(*c) for c in circles(L, 0.375, 0.01, within=(20, 12, 25, 19))], key=lambda p: -p[0])
posts = sorted([bxy(*c) for c in b_holes], key=lambda p: -p[1])
neck_screws = [bxy(*c) for c in circles(L, 0.18, 0.01, within=(15, 24, 21, 28))]
tail_route = [l for l in L if l['closed'] and abs(l['bbox'][2] - l['bbox'][0] - 2.751) < 0.01][0]
rhythm = [l for l in L if l['closed'] and abs(l['bbox'][2] - l['bbox'][0] - 1.975) < 0.01][0]

out = dict(
    units='inch', scale=SCALE, neck_length=NECK_LEN,
    sources=dict(body='Fender-Jazzmaster-Body-Route-Pickguard.pdf', check='Fender-Jazzmaster-62-Body.pdf'),
    body_outline=body,
    neck_pocket=dict(x_floor=round(SADDLE_Y - POCKET_FLOOR, 4), x_mouth=round(SADDLE_Y - POCKET_MOUTH, 4), half_width=round(pocket_half, 4), depth=0.625),
    guard_original=guard, guard_cutouts=cut_outlines, pickups=pickups, guard_screws=g_screws, lead_holes=lead,
    bridge_posts=posts, neck_screws=neck_screws,
    tail_route=[bxy(*p) for p in resample(tail_route['pts'], 0.05)],
    rhythm_route=[bxy(*p) for p in resample(rhythm['pts'], 0.05)],
)
json.dump(out, open(os.path.join(REF, 'parsed', 'jm.json'), 'w'), indent=1)
bx = [p[0] for p in body]; by = [p[1] for p in body]
print(f'body {len(body)} pts X {min(bx):.3f}..{max(bx):.3f} ({max(bx) - min(bx):.3f})  Y {min(by):.3f}..{max(by):.3f} ({max(by) - min(by):.3f})')
print('pocket', out['neck_pocket'], 'guard dy', round(GDY, 4))
print('pickups', pickups)
print('bridge posts', posts)
print('lead holes', lead)
print('neck screws', neck_screws)
print('tail route x', min(p[0] for p in out['tail_route']), max(p[0] for p in out['tail_route']))
