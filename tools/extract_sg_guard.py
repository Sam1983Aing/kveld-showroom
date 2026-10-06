"""The 1961-62 SG small pickguard (Electric Herald sheet, 1:1) into sg.json.

  /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 tools/extract_sg_guard.py

Source: reference/sg/02-Gibson-SG-Pickguard.pdf. The guard as drawn: neck end
at the top, the tab (25 x 46 mm) on the left, which sits between the two
pickups, the long curve on the right toward the treble rim. 95.5 x 180.5 mm,
five 2.5 mm screw holes.

Written in the guard's own frame, inches: u across from the tab's edge (+ toward
the treble rim), v along from the neck end (+ toward the tail). The build
places it.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from plan_kit import *  # noqa: E402,F401

REF = os.path.join(ROOT, 'reference', 'sg')
S = strokes(os.path.join(REF, 'svg', '02-Gibson-SG-Pickguard.svg'))
L = loops_of(S)
out = max(L, key=lambda l: l['length'])
x0, y0 = out['bbox'][0], out['bbox'][1]
# the five screw holes (2.5 mm): small circles inside the outline (the
# others on the sheet are dimension glyphs)
def inside_pt(q, poly):
    c = False
    for (ax, ay), (bx, by) in zip(poly, poly[1:] + poly[:1]):
        if (ay > q[1]) != (by > q[1]) and q[0] < ax + (q[1] - ay) * (bx - ax) / (by - ay):
            c = not c
    return c


holes = [centre(l) for l in L if l['closed'] and abs(dia(l) - 0.098) < 0.01 and l['length'] < 0.6 and inside_pt(centre(l), out['pts'])]
import math
holes = [h for h in holes if all(math.dist(h, g) > 0.3 for g in holes if g is not h)]   # glyphs come in pairs ("92.5")
uv = lambda p: (round(p[0] - x0, 4), round(p[1] - y0, 4))
J = os.path.join(REF, 'parsed', 'sg.json')
D = json.load(open(J))
D['small_guard'] = dict(source='02-Gibson-SG-Pickguard.pdf', frame='u across from the tab edge, v from the neck end, inches',
                        outline=[uv(p) for p in resample(out['pts'], 0.03)], holes=[uv(h) for h in holes])
json.dump(D, open(J, 'w'), indent=1)
us = [p[0] for p in D['small_guard']['outline']]; vs = [p[1] for p in D['small_guard']['outline']]
print('small guard %.3f x %.3f in (%.1f x %.1f mm), %d points, holes %s' % (max(us), max(vs), max(us) * 25.4, max(vs) * 25.4,
      len(us), D['small_guard']['holes']))
