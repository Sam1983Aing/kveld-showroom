"""Sedge (KVELD) from the Music Man Axis plan: sheet geometry into model space.

  /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 tools/extract_axis.py

Source (electricherald.com, free template, reference/axis/MusicManAxis.pdf): one
1:1 front view on A0 (the PDF has broken stream lengths; pdftocairo reads it
with warnings). Body outline, the dashed line where the carved top starts to
fall on the bass side, two humbuckers, the saddle line and the nut (648 mm =
25.5 in apart), 22 frets, a 10 in radius, the knob and jack.

Model frame: X along the strings from the saddle line (+ to the headstock),
Y across (+ bass), inches. On the sheet the neck points right, bass at the top.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from plan_kit import *  # noqa: E402,F401

REF = os.path.join(ROOT, 'reference', 'axis')
S = strokes(os.path.join(REF, 'svg', 'MusicManAxis.svg'))
L = sorted(loops_of(S), key=lambda l: -l['length'])
CL = 16.32                                       # the drawn centreline
SAD = [l for l in L if not l['closed'] and l['bbox'][2] - l['bbox'][0] < 0.01 and 10.3 < l['bbox'][0] < 10.5][0]['bbox'][0]
NUT = [l for l in L if not l['closed'] and l['bbox'][2] - l['bbox'][0] < 0.01 and 35.8 < l['bbox'][0] < 35.9][0]['bbox'][0]


def mxy(x, y):
    return (round(x - SAD, 4), round(CL - y, 4))


body = [mxy(*p) for p in resample(L[0]['pts'], 0.04)]
carve = [mxy(*p) for p in resample(L[7]['pts'], 0.08, closed=False)]
pu = sorted([centre(l) for l in L if l['closed'] and 1.5 < l['bbox'][2] - l['bbox'][0] < 1.9 and 3.2 < l['bbox'][3] - l['bbox'][1] < 3.4])
LS = loops_of([s for s in S if all(8 < x < 26 and 12 < y < 28 for x, y in s)])
knob = mxy(*circles(LS, 1.0, 0.01)[0])
jack = mxy(*circles(LS, 0.622, 0.01)[0])
neck_edges = [l for l in L if l['closed'] and l['bbox'][2] - l['bbox'][0] > 18 and l['bbox'][3] - l['bbox'][1] < 0.4]
butt = min(l['bbox'][0] for l in neck_edges)
# the dashed curve under the neck: where the body ends beneath it (the heel)
heel = [l for l in L if not l['closed'] and 19.0 < l['bbox'][0] < 19.6 and 3.0 < l['length'] < 3.6][0]
heel_curve = [mxy(*p) for p in resample(heel['pts'], 0.04, closed=False)]

out = dict(
    units='inch', scale=round(NUT - SAD, 4), sources=dict(all='MusicManAxis.pdf'),
    body_outline=body, carve_line=carve, pickups=[mxy(*c) for c in pu], knob=knob, jack=jack,
    neck_butt_x=round(butt - SAD, 4), heel_curve=heel_curve, radius=10.0, frets=22, nut_width=1.625,
)
json.dump(out, open(os.path.join(REF, 'parsed', 'axis.json'), 'w'), indent=1)
bx = [p[0] for p in body]; by = [p[1] for p in body]
print(f'scale {NUT - SAD:.3f}  body X {min(bx):.3f}..{max(bx):.3f} ({max(bx) - min(bx):.3f})  Y {min(by):.3f}..{max(by):.3f} ({max(by) - min(by):.3f})')
print('pickups', out['pickups'], 'knob', knob, 'jack', jack, 'butt', out['neck_butt_x'])
print('carve line', carve[0], carve[-1], len(carve))
print('heel curve', heel_curve[0], heel_curve[-1], len(heel_curve))
print('outline samples', [tuple(round(v, 2) for v in p) for p in body[::40]])
