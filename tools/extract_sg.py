"""Scree (KVELD) from the SG plans: sheet geometry into model space.

  /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 tools/extract_sg.py

Sources (electricherald.com, free templates, reference/sg/):
  01-Gibson-SG-Complete-Template.pdf   1:1 body with its bevel lines, pickups,
      knobs, toggle, guard. Used for the body and everything on it.
  04-Gibson-SG-Plans.pdf               1:1 plans in mm with sections. Its frets
      give a 24.75 in scale exactly (fret 1 to 2 is 1.312 in), so it fixes where
      the strings start and end: the nut, the slanted bridge, the stopbar.
      Body 35 mm thick, neck pitched 2 degrees, headstock 13 degrees.

The template's own frets don't agree with its bridge (they put the bridge 0.6 in
off), so the two sheets are tied by the pickups instead: both draw the bridge and
neck humbuckers 3.52 in apart, and the bridge pickup centre is 1.399 in ahead of
the saddle line on the plans sheet.

Model frame: X along the strings from the saddle line (+ to the headstock),
Y across (+ bass), inches. Both sheets have the neck to the right and the bass
side at the top.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from plan_kit import *  # noqa: E402,F401

REF = os.path.join(ROOT, 'reference', 'sg')
SCALE = 24.75

# ------------------------------------------------------- the plans sheet ----
P4 = strokes(os.path.join(REF, 'svg', '04-Gibson-SG-Plans.svg'))
pairs = {}
for s in P4:
    for a, b in zip(s, s[1:]):
        if abs(a[0] - b[0]) < 2e-3 and 1.6 < abs(a[1] - b[1]) < 2.4 and 19 < a[0] < 35.7 and 23.6 < min(a[1], b[1]) < 24.1:
            pairs[round(a[0], 3)] = 1
xs = sorted(pairs)
wires = sorted(((a + b) / 2 for a, b in zip(xs[0::2], xs[1::2])), reverse=True)      # fret 1 first
nut4 = [w + SCALE * (1 - 2 ** (-(n + 1) / 12)) for n, w in enumerate(wires)]
NUT4 = sum(nut4) / len(nut4)
SAD4 = NUT4 - SCALE
L4 = loops_of([s for s in P4 if all(6 < x < 14 and 21 < y < 29 for x, y in s)])
CL4 = 24.869
wheels = sorted([centre(l) for l in L4 if l['closed'] and abs(dia(l) - 0.237) < 0.004], key=lambda c: c[1])
studs = sorted([centre(l) for l in L4 if l['closed'] and abs(dia(l) - 0.552) < 0.004], key=lambda c: c[1])
ring4 = [l for l in L4 if l['closed'] and abs(l['bbox'][2] - l['bbox'][0] - 1.733) < 0.01][0]
BRIDGE_PU_X = centre(ring4)[0] - SAD4                       # 1.399


def x4(x, y):
    return (round(x - SAD4, 4), round(CL4 - y, 4))


tom_posts = [x4(*c) for c in wheels]                        # bass first (top of the sheet)
stop_studs = [x4(*c) for c in studs]

# ------------------------------------------------------- the template ----
P1 = strokes(os.path.join(REF, 'svg', '01-Gibson-SG-Complete-Template.svg'))
L1 = sorted(loops_of(P1), key=lambda l: -l['length'])
CL1 = 13.345                                                # midway between the bridge posts
rings = sorted([centre(l) for l in L1 if l['closed'] and abs(l['bbox'][2] - l['bbox'][0] - 1.562) < 0.01 and l['bbox'][1] > 11])
SAD1 = rings[0][0] - BRIDGE_PU_X                            # tie: the bridge pickup


def x1(x, y):
    return (round(x - SAD1, 4), round(CL1 - y, 4))


# body outline: the long run, minus the neck tenon and the bevel arc chained into it
run = L1[5]['pts']
i_end = next(i for i, p in enumerate(run) if math.dist(p, (19.6317, 12.2917)) < 0.01)
cut_arc = run[:i_end + 1]                                   # bass cutaway bevel arc
rest = run[i_end + 1:]
i_ten = next(i for i, p in enumerate(rest) if math.dist(p, (19.595, 14.4067)) < 0.01)
outline = rest[i_ten:]                                      # from the treble side of the neck round to the bass side
body = [x1(*p) for p in resample(outline, 0.04, closed=True)]


def run_between(a, b, near=0.02):
    """The drawn stroke with ends at a and b (either way round)."""
    for s in P1:
        if len(s) > 2 and ((math.dist(s[0], a) < near and math.dist(s[-1], b) < near) or (math.dist(s[0], b) < near and math.dist(s[-1], a) < near)):
            return s
    raise KeyError((a, b))


bass_line = L1[23]['pts'][::-1] + L1[37]['pts'][::-1]      # tail to the bass horn
bass_line = [p for k, p in enumerate(bass_line) if k == 0 or math.dist(p, bass_line[k - 1]) > 1e-4]
treb_line = run_between((15.44, 17.62), (20.48, 17.2), 0.02)
treb_arc = run_between((19.03, 14.78), (20.48, 17.2), 0.02)
bevels = dict(bass=[x1(*p) for p in resample(bass_line, 0.08, closed=False)],
              bass_cutaway=[x1(*p) for p in resample(cut_arc, 0.06, closed=False)],
              treble=[x1(*p) for p in resample(treb_line, 0.08, closed=False)],
              treble_cutaway=[x1(*p) for p in resample(treb_arc, 0.06, closed=False)])

LS = loops_of([s for s in P1 if all(4 < x < 22 and 6 < y < 21 for x, y in s)])
knobs = sorted([x1(*c) for c in circles(LS, 0.245, 0.004)])
toggle = x1(*circles(LS, 0.43, 0.01)[0])
guard = [x1(*p) for p in resample(L1[7]['pts'], 0.05, closed=False)]

out = dict(
    units='inch', scale=SCALE,
    sources=dict(body='01-Gibson-SG-Complete-Template.pdf', strings='04-Gibson-SG-Plans.pdf'),
    nut_check=dict(spread=round(max(nut4) - min(nut4), 4), frets_used=len(wires)),
    body_outline=body, neck_joint_x=round(max(p[0] for p in body if abs(p[1]) < 0.9), 4),
    bevels=bevels, pickups=[x1(*c) for c in rings], tom_posts=tom_posts, stop_studs=stop_studs,
    knobs=knobs, toggle=toggle, guard_original=guard,
    body_t=round(35 / 25.4, 4), neck_pitch_deg=2.0, head_pitch_deg=13.0,
)
json.dump(out, open(os.path.join(REF, 'parsed', 'sg.json'), 'w'), indent=1)
bx = [p[0] for p in body]; by = [p[1] for p in body]
print(f'body {len(body)} pts X {min(bx):.3f}..{max(bx):.3f} ({max(bx) - min(bx):.3f})  Y {min(by):.3f}..{max(by):.3f} ({max(by) - min(by):.3f})')
print('nut fit from', len(wires), 'frets, spread', out['nut_check'])
print('pickups', out['pickups'], 'neck joint', out['neck_joint_x'])
print('tom posts', tom_posts, 'studs', stop_studs)
print('knobs', knobs, 'toggle', toggle)
for k, v in bevels.items():
    print('bevel', k, len(v), v[0], v[-1])
plot(os.path.join(REF, 'parsed', 'sg_check.png'),
     [([[(p[0], -p[1]) for p in body + body[:1]]], (0.9, 0.2, 0.1), 2)]
     + [([[(p[0], -p[1]) for p in v]], (0.1, 0.3, 0.9), 2) for v in bevels.values()], (-10, -8, 8, 8), ppi=40)
