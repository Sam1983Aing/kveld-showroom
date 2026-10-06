"""Turn the Telecaster plan drawings into model-space geometry.

Run with Blender's bundled Python (it has numpy):
  /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 tools/extract_tele.py

Reads  reference/telecaster/svg/*.svg   (pdftocairo -svg of the plan PDFs)
Writes reference/telecaster/parsed/tele.json

Model frame, in inches (the Blender script converts to metres):
  X  along the strings, 0 at the saddle line, +X toward the headstock
  Y  across, +Y is the bass side (low E)
  Z  up, 0 is the top face of the body
"""
import json, math, os, re, sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from parse_plan import segments, chain, PT  # noqa: E402

REF = os.path.join(ROOT, 'reference', 'telecaster')
SCALE = 25.5

def strokes(name):
    svg = open(os.path.join(REF, 'svg', name)).read()
    out = []
    for d in re.findall(r' d="([^"]+)"', svg):
        for s in segments(d):
            out.append([(x * PT, y * PT) for x, y in s])
    return out

def loops_of(strks):
    runs = chain([[(x / PT, y / PT) for x, y in s] for s in strks], tol=0.6)
    out = []
    for r in runs:
        pts = [(x * PT, y * PT) for x, y in r]
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        out.append(dict(pts=pts, closed=math.dist(pts[0], pts[-1]) < 0.02,
                        bbox=(min(xs), min(ys), max(xs), max(ys))))
    return out

def centre(l):
    b = l['bbox']; return ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)

def dia(l):
    b = l['bbox']; return b[2] - b[0]

# ---------------------------------------------------------------- body ----
body_strokes = strokes('Fender-Telecaster-Body-Pickgaurd.svg')
body_loops = loops_of(body_strokes)

def silhouette(strks, box, res=0.01):
    """Outer boundary of every stroke inside box, by flood filling the outside."""
    x0, y0, x1, y1 = box
    W = int((x1 - x0) / res) + 1; H = int((y1 - y0) / res) + 1
    ink = np.zeros((H, W), bool)
    for s in strks:
        for (ax, ay), (bx, by) in zip(s, s[1:]):
            n = max(2, int(math.dist((ax, ay), (bx, by)) / (res * 0.4)))
            t = np.linspace(0, 1, n)
            px = ((ax + (bx - ax) * t - x0) / res).round().astype(int)
            py = ((ay + (by - ay) * t - y0) / res).round().astype(int)
            ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
            ink[py[ok], px[ok]] = True
    ink = dilate(ink, 1)
    out = np.zeros_like(ink)
    out[0, :] = out[-1, :] = out[:, 0] = out[:, -1] = True
    out &= ~ink
    while True:
        grown = dilate(out, 1) & ~ink
        if grown.sum() == out.sum():
            break
        out = grown
    mask = ~out
    # opening strips the dimension ticks and drill lines that poke outside
    mask = dilate(erode(mask, 4), 4)
    return mask, (x0, y0, res)

def dilate(m, r):
    o = m.copy()
    for _ in range(r):
        n = o.copy()
        n[1:, :] |= o[:-1, :]; n[:-1, :] |= o[1:, :]
        n[:, 1:] |= o[:, :-1]; n[:, :-1] |= o[:, 1:]
        o = n
    return o

def erode(m, r):
    return ~dilate(~m, r)

def trace(mask):
    """Moore-neighbour walk around the single blob, returns pixel corners."""
    H, W = mask.shape
    ys, xs = np.nonzero(mask)
    i = np.lexsort((xs, ys))[0]
    start = (int(xs[i]), int(ys[i]))
    nbr = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
    path = [start]; cur = start; back = 4
    while True:
        for k in range(8):
            d = (back + 1 + k) % 8
            nx, ny = cur[0] + nbr[d][0], cur[1] + nbr[d][1]
            if 0 <= nx < W and 0 <= ny < H and mask[ny, nx]:
                back = (d + 4) % 8
                cur = (nx, ny)
                break
        if cur == start:
            break
        path.append(cur)
        if len(path) > 200000:
            raise RuntimeError('trace ran away')
    return path

def snap(pts, strks, reach=0.05):
    """Pull each traced point onto the nearest drawn stroke."""
    cell = 0.05; grid = {}
    for s in strks:
        dense = []
        for (ax, ay), (bx, by) in zip(s, s[1:]):
            n = max(1, int(math.dist((ax, ay), (bx, by)) / 0.004))
            for j in range(n):
                t = j / n; dense.append((ax + (bx - ax) * t, ay + (by - ay) * t))
        dense.append(s[-1])
        for p in dense:
            grid.setdefault((int(p[0] / cell), int(p[1] / cell)), []).append(p)
    out = []
    for p in pts:
        cx, cy = int(p[0] / cell), int(p[1] / cell); best = None; bd = reach
        for gx in (cx - 1, cx, cx + 1):
            for gy in (cy - 1, cy, cy + 1):
                for q in grid.get((gx, gy), ()):
                    d = math.dist(p, q)
                    if d < bd: bd, best = d, q
        out.append(best if best else p)
    return out

def resample(pts, step, closed=True):
    pts = list(pts) + ([pts[0]] if closed else [])
    seg = [math.dist(a, b) for a, b in zip(pts, pts[1:])]
    total = sum(seg); n = max(8, int(total / step)); out = []
    k = 0; acc = 0.0
    for i in range(n):
        target = total * i / n
        while acc + seg[k] < target:
            acc += seg[k]; k += 1
        t = (target - acc) / seg[k] if seg[k] else 0
        a, b = pts[k], pts[k + 1]
        out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out

def smooth(pts, r):
    n = len(pts); out = []
    for i in range(n):
        xs = [pts[(i + j) % n][0] for j in range(-r, r + 1)]
        ys = [pts[(i + j) % n][1] for j in range(-r, r + 1)]
        out.append((sum(xs) / len(xs), sum(ys) / len(ys)))
    return out

# The body sits in raw x 2.88..18.84, raw y 15.09..27.85 on the sheet.
inside = [s for s in body_strokes
          if all(2.4 < x < 19.4 and 14.6 < y < 28.4 for x, y in s)
          or any(2.8 < x < 19.0 and 15.0 < y < 28.0 for x, y in s)]
mask, (mx0, my0, mres) = silhouette(inside, (2.3, 14.6, 19.4, 28.4))
px = trace(mask)
raw = [(mx0 + x * mres, my0 + y * mres) for x, y in px]
raw = smooth(resample(raw, 0.02), 2)
raw = snap(raw, inside)
raw = smooth(resample(raw, 0.03), 1)
body_raw = resample(raw, 0.04)

# Datums, straight off the drawing
CL_Y = 21.4705                  # string centreline (raw y of holes 50/51)
POCKET_BOTTOM = 5.998           # raw x of the neck pocket floor end
body_holes = [l for l in body_loops if l['closed'] and dia(l) < 0.5]
pg_loops = [l for l in body_loops if l['closed'] and l['bbox'][0] > 3 and l['bbox'][2] < 11.2
            and l['bbox'][1] > 4 and l['bbox'][3] < 13.2]

# ----------------------------------------------------------------- neck ----
neck_strokes = strokes('Fender-Telecaster-Neck.svg')
neck_loops = loops_of(neck_strokes)
face = max((l for l in neck_loops if l['closed']), key=lambda l: l['bbox'][2] - l['bbox'][0]
           if l['bbox'][0] > 12 else 0)
side = [l for l in neck_loops if 8.9 < l['bbox'][0] < 9.0 and l['bbox'][3] - l['bbox'][1] > 25][0]
NUT_Y = 10.73                    # raw y of the fret-side face of the nut
NECK_CL = 14.754                 # raw x of the neck centreline in the face view
HEEL_Y = face['bbox'][3]         # raw y of the neck butt
NECK_LEN = HEEL_Y - NUT_Y        # nut face to butt

def cuts(pts, v, axis):
    """Where a polyline crosses the line axis=v; returns the other coordinate."""
    o = 1 - axis; out = []
    for a, b in zip(pts, pts[1:]):
        if (a[axis] - v) * (b[axis] - v) <= 0 and a[axis] != b[axis]:
            t = (v - a[axis]) / (b[axis] - a[axis]); out.append(a[o] + t * (b[o] - a[o]))
    return sorted(out)

# Saddle line on the sheet: the neck butt sits on the pocket floor, and the
# nut is SCALE ahead of the saddles.
SADDLE_RAW_X = POCKET_BOTTOM + (SCALE - NECK_LEN)

def body_xy(rx, ry):
    return (SADDLE_RAW_X - rx, CL_Y - ry)

def neck_x(ry):
    return SCALE - (ry - NUT_Y)

# Neck plan width (fretboard + heel), sampled along its length
neck_width = []
for i in range(0, 400):
    ry = NUT_Y + i * 0.05
    if ry > HEEL_Y - 0.001: ry = HEEL_Y - 0.001
    c = cuts(face['pts'], ry, 1)
    if len(c) >= 2:
        neck_width.append((neck_x(ry), c[0] - NECK_CL, c[-1] - NECK_CL))
    if ry >= HEEL_Y - 0.001: break

# Side view: fretboard crown (top) and the back of the neck (bottom)
TOP_PLAN = side['bbox'][0]       # 8.966, fretboard crown
profile = []
for i in range(0, 600):
    ry = side['bbox'][1] + 0.002 + i * 0.05
    if ry > side['bbox'][3] - 0.002: break
    c = cuts(side['pts'], ry, 1)
    if len(c) >= 2:
        profile.append((neck_x(ry), TOP_PLAN - c[0], TOP_PLAN - c[-1]))  # (X, top drop, back drop)

face_holes = [l for l in neck_loops if l['closed'] and dia(l) < 0.6 and l['bbox'][0] > 12]
posts = sorted({(round(centre(l)[0], 3), round(centre(l)[1], 3)) for l in face_holes if abs(dia(l) - 0.348) < 0.01},
               key=lambda p: -p[1])
dots = sorted({(round(centre(l)[0], 3), round(centre(l)[1], 3)) for l in face_holes if abs(dia(l) - 0.25) < 0.01})
skunk = [l for l in neck_loops if l['closed'] and abs(dia(l) - 0.22) < 0.01][0]['bbox']

# ---------------------------------------------------------------- write ----
pg_outline = max(pg_loops, key=lambda l: l['bbox'][2] - l['bbox'][0])
pg_slot = [l for l in pg_loops if abs((l['bbox'][2] - l['bbox'][0]) - 0.615) < 0.02][0]
pg_holes = [centre(l) for l in pg_loops if abs(dia(l) - 0.2) < 0.01]
# pickguard is drawn beside the body: its screw holes sit 13.727 in along raw y
body_pg_pilots = [centre(l) for l in body_holes if abs(dia(l) - 0.07) < 0.008]
dy = np.median([min(abs(b[1] - p[1]) for b in body_pg_pilots if abs(b[0] - p[0]) < 0.01) for p in pg_holes])
dy = float(round(dy, 4))

def pg_xy(rx, ry):
    return body_xy(rx, ry + dy)

out = dict(
    units='inch',
    scale=SCALE,
    neck_length=NECK_LEN,
    pickguard_offset=dy,
    body_outline=[body_xy(*p) for p in body_raw],
    pickguard_outline=[pg_xy(*p) for p in resample(pg_outline['pts'][:-1], 0.03)],
    pickguard_neck_slot=[pg_xy(*p) for p in resample(pg_slot['pts'][:-1], 0.02)],
    pickguard_screws=[pg_xy(*p) for p in pg_holes],
    neck_screws=[body_xy(*centre(l)) for l in body_holes if abs(dia(l) - 0.16) < 0.005 and centre(l)[0] < 6],
    bridge_screws=[body_xy(*centre(l)) for l in body_holes if abs(dia(l) - 0.16) < 0.005 and centre(l)[0] > 13],
    string_holes=sorted([body_xy(*centre(l)) for l in body_holes if abs(dia(l) - 0.38) < 0.01], key=lambda p: -p[1]),
    neck_pickup_screws=[body_xy(*centre(l)) for l in body_holes if abs(dia(l) - 0.188) < 0.005],
    control_plate_screws=[body_xy(*centre(l)) for l in body_holes if abs(dia(l) - 0.065) < 0.004],
    control_cavity=[body_xy(10.982, 24.583), body_xy(15.752, 25.583)],
    bridge_pickup_route=[body_xy(*p) for p in resample([l for l in body_loops if l['closed'] and abs(l['bbox'][2] - l['bbox'][0] - 1.864) < 0.01][0]['pts'][:-1], 0.03)],
    jack_bore=[body_xy(15.46, 25.058), body_xy(17.243, 28.389)],
    neck_pocket=dict(x_floor=body_xy(POCKET_BOTTOM, CL_Y)[0], x_open=body_xy(2.996, CL_Y)[0], half_width=22.563 - CL_Y, depth=0.625),
    neck_width=neck_width,
    neck_profile=profile,
    tuner_posts=[(neck_x(ry), rx - NECK_CL) for rx, ry in posts],
    dots=[(neck_x(ry), rx - NECK_CL) for rx, ry in dots],
    skunk_stripe=dict(x0=neck_x(skunk[3]), x1=neck_x(skunk[1]), width=skunk[2] - skunk[0]),
    frets=[SCALE * 2 ** (-n / 12) for n in range(1, 22)],
)
dst = os.path.join(REF, 'parsed', 'tele.json')
json.dump(out, open(dst, 'w'), indent=1)

bx = [p[0] for p in out['body_outline']]; by = [p[1] for p in out['body_outline']]
print(f"body outline {len(bx)} pts, X {min(bx):.3f}..{max(bx):.3f} ({max(bx)-min(bx):.3f})  Y {min(by):.3f}..{max(by):.3f} ({max(by)-min(by):.3f})")
print(f"neck length {NECK_LEN:.3f}, saddle raw x {SADDLE_RAW_X:.3f}, pickguard dy {dy}")
print('tuner posts', [(round(a, 3), round(b, 3)) for a, b in out['tuner_posts']])
print('string holes', [(round(a, 3), round(b, 3)) for a, b in out['string_holes']])
print('neck screws', [(round(a, 3), round(b, 3)) for a, b in out['neck_screws']])
print('bridge screws', [(round(a, 3), round(b, 3)) for a, b in out['bridge_screws']])
print('neck pickup screws', out['neck_pickup_screws'])
print('control screws', out['control_plate_screws'])
print('pocket', out['neck_pocket'])
print('skunk', out['skunk_stripe'])
print('dots', len(out['dots']), 'width samples', len(neck_width), 'profile samples', len(profile))
print('first/last width', neck_width[0], neck_width[-1])
print('profile head', profile[:3], 'tail', profile[-3:])
