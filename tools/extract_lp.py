"""Rowan (KVELD) from the Les Paul plans: sheet geometry into model space.

  /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 tools/extract_lp.py

Sources (electricherald.com, free templates, reference/lespaul/), all 1:1:
  Gibson-Les-Paul-Isolines.pdf    body outline and twelve isolines of the carve
  Les-Paul-Front-Front-Side-Profile-Carved-Top.pdf
      four sections through the maple cap (3/16 in at the rim, 0.543 in at the
      crown: 12 isolines at 1/32 in), the side of the body (1.845 in of
      mahogany under the cap), and a front plan with the pickup rings, the
      slanted bridge posts, stopbar studs, four knobs and the toggle.
The two front views agree to 0.02 in (13.06 in wide, tail at the same place).

No frets on these sheets, so the scale is the nominal 24.75 in and the saddle
line is put 0.19 in ahead of the treble post, as the SG plans measure it.
Model frame: X along the strings from the saddle line (+ to the headstock), Y
across (+ bass), inches. The sheets have the neck up, bass on the left.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from plan_kit import *  # noqa: E402,F401

REF = os.path.join(ROOT, 'reference', 'lespaul')
SCALE = 24.75

# ------------------------------------------------------- the front plan ----
F = strokes(os.path.join(REF, 'svg', 'Les-Paul-Front-Front-Side-Profile-Carved-Top.svg'))
LF = loops_of([s for s in F if all(13 < x < 30 and 20 < y < 43 for x, y in s)])
CLF, TAILF = 22.198, 42.649


# The plan draws its holes as crosshair circles split into quarter arcs, which
# the loop finder can't pair reliably; these centres were read off the
# quarter-arc ends (printed by the first pass of this script).
posts = [(20.595, 35.090), (23.530, 34.952)]       # bass, treble: the bass end sits 0.138 in further back
studs = [(20.397, 36.625), (23.652, 36.625)]
knobs = [(26.639, 38.284), (25.007, 39.242), (25.007, 36.881), (26.753, 35.847)]
toggle = (19.199, 27.620)
ring_y = [(28.500 + 30.212) / 2, (32.516 + 34.228) / 2]   # neck ring, bridge ring (top and bottom edges)
SAD = posts[1][1] - 0.19


def fxy(x, y):
    return (round(SAD - y, 4), round(CLF - x, 4))


# --------------------------------------------------------- the isolines ----
I = strokes(os.path.join(REF, 'svg', 'Gibson-Les-Paul-Isolines.svg'))
LI = sorted(loops_of(I), key=lambda l: -l['length'])
CLI, TAILI = 8.115, LI[0]['bbox'][3]
DX, DY = CLF - CLI, TAILF - TAILI


def ixy(x, y):
    return fxy(x + DX, y + DY)


body = [ixy(*p) for p in resample(LI[0]['pts'], 0.04)]
# the isolines: whole loops, and halves drawn either side of the centreline
parts = [l for l in LI[1:] if l['length'] > 5 and not (abs(l['bbox'][2] - l['bbox'][0]) < 0.05)]
parts = [l for l in parts if not (l['bbox'][1] < 1.2 and l['bbox'][3] < 2.5)]          # the pocket lines
whole = [l['pts'] for l in parts if l['bbox'][0] < CLI - 0.1 and l['bbox'][2] > CLI + 0.1]
halves = [l for l in parts if not (l['bbox'][0] < CLI - 0.1 and l['bbox'][2] > CLI + 0.1)]
left = [h for h in halves if h['bbox'][2] < CLI + 0.1]
right = [h for h in halves if h['bbox'][0] > CLI - 0.1]
for a in left:
    b = min(right, key=lambda h: abs(h['bbox'][1] - a['bbox'][1]) + abs(h['bbox'][3] - a['bbox'][3]))
    pa, pb = a['pts'], b['pts']
    if math.dist(pa[-1], pb[0]) > math.dist(pa[-1], pb[-1]):
        pb = pb[::-1]
    whole.append(pa + pb)
loops = []
for w in whole:
    xs = [p[0] for p in w]; ys = [p[1] for p in w]
    loops.append((-(max(xs) - min(xs)) * (max(ys) - min(ys)), w))
loops.sort()
STEP = (0.543 - 0.188) / len(loops)
iso = [dict(h=round((k + 1) * STEP, 4), loop=[[round(a, 4), round(b, 4)] for a, b in (ixy(*p) for p in resample(w, 0.06))])
       for k, (_, w) in enumerate(loops)]

out = dict(
    units='inch', scale=SCALE,
    sources=dict(carve='Gibson-Les-Paul-Isolines.pdf', hardware='Les-Paul-Front-Front-Side-Profile-Carved-Top.pdf'),
    body_outline=body, neck_joint_x=round(max(p[0] for p in body if abs(p[1]) < 0.8), 4),
    isolines=iso, cap_rim=0.188, cap_crown=0.543, back=1.845,
    # the crosshair readings sit about 0.15 in off to one side: centre the pairs
    tom_posts=[(fxy(*posts[0])[0], round((fxy(*posts[0])[1] - fxy(*posts[1])[1]) / 2, 4)),
               (fxy(*posts[1])[0], -round((fxy(*posts[0])[1] - fxy(*posts[1])[1]) / 2, 4))],
    stop_studs=[(fxy(*studs[0])[0], round((fxy(*studs[0])[1] - fxy(*studs[1])[1]) / 2, 4)),
                (fxy(*studs[1])[0], -round((fxy(*studs[0])[1] - fxy(*studs[1])[1]) / 2, 4))],
    knobs=[fxy(*c) for c in knobs], toggle=fxy(*toggle), pickups=sorted([fxy(CLF, y) for y in ring_y]),
    neck_pitch_deg=4.0, head_pitch_deg=17.0,
)
json.dump(out, open(os.path.join(REF, 'parsed', 'lp.json'), 'w'), indent=1)
bx = [p[0] for p in body]; by = [p[1] for p in body]
print(f'body X {min(bx):.3f}..{max(bx):.3f} ({max(bx) - min(bx):.3f})  Y {min(by):.3f}..{max(by):.3f} ({max(by) - min(by):.3f}) joint {out["neck_joint_x"]}')
print('isolines', len(iso), 'step', round(STEP, 4), [len(i['loop']) for i in iso])
print('posts', out['tom_posts'], 'studs', out['stop_studs'])
print('knobs', out['knobs'], 'toggle', out['toggle'], 'pickups', out['pickups'])
plot(os.path.join(REF, 'parsed', 'lp_check.png'), [([[(p[0], -p[1]) for p in body + body[:1]]], (0.9, 0.2, 0.1), 2)]
     + [([[(p[0], -p[1]) for p in i['loop']]], (0.1, 0.3, 0.9), 1) for i in iso], (-10, -8, 11, 8), ppi=35)
