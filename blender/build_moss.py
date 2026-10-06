"""KVELD Moss: an offset-waist guitar built from the Jazzmaster plans.

  blender -b -P blender/build_moss.py -- [--no-export]

Dimensions from reference/jazzmaster/parsed/jm.json (tools/extract_jm.py): the
1:1 body and guard sheet, 13 13/16 x 19 3/16 in, 1.75 in alder. The neck is
the Fender 21-fret pattern the range shares (25.5 in, 7.25 in radius,
1.650 in nut), here with a rosewood board as on the '62.

KVELD's own, on top of the house headstock, logo and markers:
  - the offset softened: the treble waist filled out and lifted toward the bass one
  - both horns shorter and rounder
  - one control plate (volume, tone, three-way) in place of the rhythm circuit
    and the lead controls on the guard
  - the guard redrawn round the pickups only, four-ply tortoise
  - the jack in the rim
Comfort contours: the plan says they are not shown, so their lines are judged.
"""
import json, math, os, sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kveld_kit as K                    # noqa: E402
import kveld_parts as P                  # noqa: E402
from kveld_parts import smoothstep        # noqa: E402
from kveld_kit import IN, principled, srgb, slab, lathe, place, rounded_rect, catmull, merge, ccw  # noqa: E402

ROOT = K.ROOT
D = json.load(open(os.path.join(ROOT, 'reference', 'jazzmaster', 'parsed', 'jm.json')))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ID = 'moss'
OUT_GLB = os.path.join(ROOT, 'site', 'assets', 'models', f'{ID}.glb')
OUT_TEX = os.path.join(HERE, 'textures')
BODY_T = 1.75
UV0, UVS = (-8.25, -8.25), 20.0

scene = K.begin('Moss')
M = P.house_materials()
os.makedirs(OUT_TEX, exist_ok=True)
rose_png = os.path.join(OUT_TEX, 'heath_rosewood.png')
if not os.path.exists(rose_png):
    P.rosewood_png(rose_png, 6.9, 26.4)
tort_png = P.tortoise_png(os.path.join(OUT_TEX, 'moss_tortoise.png'), UV0, UVS)
M_PAINT = principled('Body_Alder_Olive', srgb((0.24, 0.27, 0.11)), 0.3, metal=0.04, coat=1.0, coat_rough=0.022)
M_NECK = principled('Neck_Maple', (1, 1, 1), 0.32, coat=1.0, coat_rough=0.032, tex=os.path.join(OUT_TEX, 'floe_maple.png'))
M_BOARD = principled('Board_Rosewood', (1, 1, 1), 0.48, tex=rose_png)
M_TORT = principled('Guard_Tortoise', (1, 1, 1), 0.22, coat=1.0, coat_rough=0.02, tex=tort_png)
M_WHITE = principled('Plastic_White', srgb((0.90, 0.89, 0.85)), 0.3)

# ---------------------------------------------------------------- body ----
plan_body = [tuple(p) for p in D['body_outline']]
body_pts = plan_body[::2]
bass_tip = max((p for p in body_pts if p[1] > 2), key=lambda p: p[0])
treb_tip = max((p for p in body_pts if p[1] < -2.5), key=lambda p: p[0])
treb_waist = max((p for p in body_pts if p[1] < -3 and -1 < p[0] < 4), key=lambda p: p[1])
body_pts = P.reshape_horn(body_pts, bass_tip, 0.42, radius=2.1, round_r=1.1, rounds=14)
body_pts = P.reshape_horn(body_pts, treb_tip, 0.22, radius=1.5, round_r=0.9, rounds=10)
# the offset softened: the treble waist filled out and drawn toward the bass waist
body_pts = P.push(body_pts, treb_waist, 2.3, (0.32, -0.24))
# the square treble corner at the end of the body, beside the neck, eased
# (it read as a block); kept clear of the neck's side (1.056 in out at the end)
body_pts = P.relax(body_pts, (10.1, -1.17), 0.09, rounds=20)
dev = P.departure(body_pts, plan_body)
edge = P.Edge(body_pts)
pocket = D['neck_pocket']

# comfort contours, judged (the sheet leaves them out): shallower than a Strat's.
# Each is a band along the rim, as wide as its drawn line is from the edge,
# easing in and out along its length and rolling from level at the top to its
# full depth at the rim. (Built as a fall-off from the line itself, each read as
# a tilted facet with a crease at the edge.)
ARM_LINE = [(-7.8, -0.6), (-3.8, 3.15), (0.2, 6.9)]
BELLY_LINE = [(10.6, 4.0), (7.2, 3.15), (3.6, 2.85), (0.6, 3.7), (-1.9, 6.6)]


def band_fn(line, depth):
    line = catmull(line, per=12, closed=False) if len(line) > 3 else [tuple(np.array(line[0]) + (np.array(line[-1]) - np.array(line[0])) * k / 40)
                                                                       for k in range(41)]
    return P.SmoothGrid(lambda X, Y: P.edge_band_grid(body_pts, [line], depth, X, Y, soft=0.25, win=2.0, ease=1.5, w_ref=0.8, power=1.7,
                                                         nearest=True),
                        body_pts, step=0.03, blur=6)


arm = band_fn(ARM_LINE, 0.75)


def belly_widths(rim, x0=9.2, x1=-2.6, peak=2.3, at=0.55):
    """The belly cut's width along the bass rim: one smooth swell from the
    horn's root to the waist. (Drawn as a line, its first stretch landed on the
    horn and the band stopped and restarted, which lit as a zigzag.)"""
    side = rim[:, 1] > 1.5
    n = len(rim)
    cum = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(np.vstack([rim, rim[:1]]), axis=0).T))])[:n]
    ia = int(np.argmin(np.where(side, np.hypot(rim[:, 0] - x0, rim[:, 1] - 5.0), 1e9)))
    ib = int(np.argmin(np.where(side, np.hypot(rim[:, 0] - x1, rim[:, 1] - 6.8), 1e9)))
    sa, sb = cum[ia], cum[ib]
    L = cum[-1] + math.dist(rim[-1], rim[0])
    span = (sb - sa) % L
    t = ((cum - sa) % L) / span
    if span > L / 2:                                  # take the bass-side arc
        span = (sa - sb) % L; t = ((cum - sb) % L) / span
    t = np.where(t <= 1, t, -1)
    tt = np.where(t < at, t / at * 0.5, 0.5 + (t - at) / (1 - at) * 0.5)
    return np.where((t >= 0) & (t <= 1), peak * np.sin(np.pi * np.clip(tt, 0, 1)) ** 1.6, 0.0)


belly = P.SmoothGrid(lambda X, Y: P.edge_band_grid(body_pts, [], 0.75, X, Y, soft=0.25, win=1.0, w_ref=0.8, power=1.7, nearest=False,
                                                   w_fn=belly_widths), body_pts, step=0.04, blur=24)


def top_fn(x, y):
    return -arm(x, y)


def back_fn(x, y):
    return min(-BODY_T + belly(x, y), top_fn(x, y) - 0.7)

if os.environ.get('DUMP'):
    xs_ = [p[0] for p in body_pts]; ys_ = [p[1] for p in body_pts]
    GX, GY = np.meshgrid(np.arange(min(xs_), max(xs_), 0.03), np.arange(min(ys_), max(ys_), 0.03))
    ins = P.inside(GX.ravel(), GY.ravel(), body_pts).reshape(GX.shape)
    for nm, fn in (('top', top_fn), ('back', back_fn)):
        H = np.array([[fn(x, y) for x in GX[0]] for y in GY[:, 0]])
        gy, gx = np.gradient(H, 0.03)
        lap = np.abs(np.gradient(gx, 0.03, axis=1) + np.gradient(gy, 0.03, axis=0))
        c = np.clip(lap / 4.0, 0, 1) * ins
        img = np.stack([c, c, c * 0.6 + 0.25 * (~ins)], -1)
        K.save_png(img[::-1], os.environ['DUMP'] + '_' + nm + '_curv.png')


def r_fn(p, i):
    """Edge radius scale: small (0.075 in) where the body meets the neck, across
    the end and along the treble wall beside it, growing smoothly back to the
    full 0.3 in over the next inch of rim. (Switched at a hard boundary, the
    roundover stepped where the switch fell, on both cutaways.)"""
    x, y = p
    hx, hy = 10.1, pocket['half_width']
    x0 = pocket['x_floor'] + 0.85
    dx = max(x0 - x, 0.0, x - hx); dy = max(abs(y) - hy, 0.0)
    d = math.hypot(dx, dy)
    return 0.25 + 0.75 * smoothstep(0.02, 1.1, d)


body = P.body_shell('Body', body_pts, top_fn, back_fn, M_PAINT, r_top=0.3, r_bot=0.3, steps=7, grid=0.07, grid_top=0.06,
                    top_rings=2.0, back_rings=2.0, r_fn=r_fn,
                    uv_origin=UV0, uv_size=UVS)

# ----------------------------------------------------------- the bridge ----
Y_BRIDGE = [1.03 - i * 0.412 for i in range(6)]
NK = P.BoltOnNeck(M, M_BOARD, M_NECK)
crest_z = [NK.board_z(y) + 0.148 for y in Y_BRIDGE]
GUARD_T = 0.0
posts = [tuple(p) for p in D['bridge_posts']]
bridge_bits, saddles = P.jm_bridge(Y_BRIDGE, crest_z, posts, M, z_post=0.10)

# --------------------------------------------------------- the vibrato ----
ANCHOR_X = -2.35
Y_ANCHOR = [1.05 - i * 0.42 for i in range(6)]
vib_bits, arm_bits = P.jm_vibrato(ANCHOR_X, Y_ANCHOR, M)

# ----------------------------------------------------------------- neck ----
start = [[(ANCHOR_X + 0.15, Y_ANCHOR[i], 0.30)] for i in range(6)]
crest = [(0.0, crest_z[i]) for i in range(6)]
G = NK.build(Y_BRIDGE, crest, start)

# -------------------------------------------------------------- the guard ----
GUARD_CTRL = [(7.20, -1.13), (6.95, -1.70), (6.80, -2.35), (6.40, -2.85), (5.60, -3.05), (4.40, -3.05), (3.20, -2.85), (2.00, -2.58),
              (0.90, -2.40), (0.10, -2.28), (-0.50, -2.02), (-0.64, -1.30), (-0.64, 1.30), (-0.46, 1.96), (0.30, 2.32), (1.50, 2.47),
              (2.80, 2.62), (4.20, 2.97), (5.60, 3.26), (6.90, 3.35), (7.90, 3.05), (8.42, 2.50), (8.48, 1.75), (8.30, 1.13),
              (7.40, 1.12), (7.15, 0.85), (7.10, 0.0), (7.15, -0.85)]
guard_line = catmull(GUARD_CTRL, per=10)
guard_bits, GUARD_T = P.ply_guard(guard_line, [(0.03, M_WHITE), (0.015, M['plastic']), (0.015, M_WHITE), (0.035, M_TORT)],
                                  uv_origin=UV0, uv_size=UVS)
screws = P.guard_screws(guard_line, (0.03, 0.17, 0.31, 0.44, 0.56, 0.70, 0.84, 0.95), GUARD_T, M)

# -------------------------------------------------------------- pickups ----
pu = {}
for tag, (cx, cy) in zip(('NeckPickup', 'BridgePickup'), D['pickups']):
    ys = [Y_BRIDGE[i] + (NK.y_nut[i] - Y_BRIDGE[i]) * cx / NK.scale for i in range(6)]
    pu[tag] = P.soapbar(tag.lower(), cx, 0.0, ys, GUARD_T, M, M['parchment'])

# ------------------------------------------------------------- controls ----
C_PTS = [(1.05, -3.72), (-0.75, -4.36), (-2.45, -5.20)]
c_line = catmull(C_PTS, per=14, closed=False)
plate_line = P.band(c_line, 0.62)
ctrl = [slab('ControlPlate', plate_line, 0.0, 0.06, M['chrome'], r_top=0.02, steps=3)]
ctrl += P.toggle_switch(C_PTS[0][0], C_PTS[0][1], 0.06, M, lean=(0.0, 0.3))
for k, (x, y) in enumerate(C_PTS[1:]):
    ctrl.append(P.knob(k, x, y, 0.0, M, spin=0.5 * k))
for k in (0.0, 1.0):
    i = int(k * (len(c_line) - 1))
    a = c_line[i]; b = c_line[i + (1 if k == 0 else -1)]
    t = Vector(a) - Vector(b)
    p = Vector(a) + t.normalized() * 0.42
    screws.append(P.screw(f'cp_screw_{k}', (p.x, p.y, 0.06), M, d=0.17, h=0.04))

# ------------------------------------------------- jack, straps, back ----
back_bits = []
jp, jn, _ = P.outline_point(body_pts, (-3.7, -6.9))
back_bits += P.edge_jack(jp, jn, -BODY_T / 2, M)
tail_p, tail_n, _ = P.outline_point(body_pts, (-8.0, -1.5))
hp, hn, _ = P.outline_point(body_pts, max(ccw(list(body_pts)), key=lambda p: p[0] if p[1] > 2 else -99))
back_bits.append(P.strap_button('strap_tail', tail_p, tail_n, -BODY_T / 2, M))
back_bits.append(P.strap_button('strap_horn', hp, hn, -BODY_T / 2 + 0.1, M))
back_bits += P.neck_plate(7.75, 9.75, [tuple(p) for p in D['neck_screws']], -BODY_T, M)
if os.environ.get('DBG_PLATE'):
    R_ = rounded_rect(8.75, 0, 2.52, 2.02, 0.22)
    rx = np.array([p[0] for p in R_]); ry = np.array([p[1] for p in R_])
    ins = P.inside(rx, ry, body_pts); dd = P._dist_to_poly(rx, ry, body_pts)
    print('[plate] outside', int((~ins).sum()), 'nearest rim %.3f' % dd.min(), 'at', [(round(a, 2), round(b, 2)) for a, b, d in zip(rx, ry, dd) if d < dd.min() + 0.02][:4])
    print('[plate] back under the plate edge: min %.3f max %.3f (flat back is %.3f)' % (min(back_fn(a, b) for a, b in R_), max(back_fn(a, b) for a, b in R_), -BODY_T))
    print('[plate] neck half-width at x 8 / 9 / 10: %s' % [round(NK.width(x)[1], 3) for x in (8.0, 9.0, 10.0)])
    print('[plate] body |y| beside the neck end (treble):', [round(min(abs(p[1]) for p in body_pts if abs(p[0] - xx) < 0.06 and p[1] < -0.9), 3) for xx in (9.9, 10.0, 10.06)], [(round(p[0], 2), round(p[1], 2)) for p in body_pts if p[0] > 9.8 and -1.25 < p[1] < -0.8])
    print('[plate] body end', [(round(p[0], 2), round(p[1], 2)) for p in body_pts if p[0] > 9.3 and abs(p[1]) < 2.2][::3])

# --------------------------------------------------------------- groups ----
G['Body'] = body
G['Pickguard'] = merge('Pickguard', guard_bits)
G['Screws'] = merge('Screws', screws + pu['NeckPickup'][-2:] + pu['BridgePickup'][-2:])
G['NeckPickup'] = merge('NeckPickup', pu['NeckPickup'][:-2])
G['BridgePickup'] = merge('BridgePickup', pu['BridgePickup'][:-2])
G['Bridge'] = merge('Bridge', bridge_bits)
G['Saddles'] = merge('Saddles', saddles)
G['Tailpiece'] = merge('Tailpiece', vib_bits)
G['Tremolo'] = merge('Tremolo', arm_bits)
G['Controls'] = merge('Controls', ctrl)
G['BackHardware'] = merge('BackHardware', back_bits)

tail_x = min(p[0] for p in body_pts)
rootob = P.assemble('Moss', G, tail_x, -BODY_T / 2)
print(f'[moss] objects {len(G)}, polygons {sum(len(o.data.polygons) for o in G.values())}')
bd = Vector(body.dimensions) / IN
print(f'[moss] body {bd.x:.3f} x {bd.y:.3f} x {bd.z:.3f} in')


def dev_near(pt, r=1.3):
    sel = [d for p, d in zip(body_pts, dev) if math.dist(p, pt) < r]
    return round(float(max(sel)) * 25.4, 1) if sel else 0.0


departures = dict(bass_horn_mm=dev_near(bass_tip), treble_horn_mm=dev_near(treb_tip), treble_waist_mm=dev_near(treb_waist, 1.0))
print('[moss] departures from the plan outline', departures)

page = dict(
    units='inch', brand=P.BRAND, model='Moss', scale=NK.scale, radius=NK.radius, frets=NK.n_frets, nut_width=round(2 * NK.nut_half, 3),
    body=dict(length=round(bd.x, 3), width=round(bd.y, 3), depth=BODY_T),
    neck_length=round(D['neck_length'], 3), headstock_length=round(NK.HS_TIP, 3), overall=round(NK.HS_TIP + NK.NUT_X0 - tail_x, 3),
    body_outline=P.r3(body_pts[::2]), plan_outline=P.r3(plan_body[::4]), pickguard=P.r3(guard_line[::2]), pickguard_slot=[],
    neck=P.r3(NK.page_neck()[::2]), fret_x=[round(x, 3) for x in NK.fret_x],
    fret_span=[[round(NK.width(x)[0], 3), round(NK.width(x)[1], 3)] for x in NK.fret_x],
    nut=[NK.NUT_X0, NK.NUT_X1, NK.nut_half], posts=P.r3([(NK.NUT_X0 + a, b) for a, b in P.SIX_POSTS]), dots=P.r3(NK.marks),
    pickups=[dict(kind='soapbar', x=p[0], y=0, angle=0) for p in D['pickups']],
    control_plate=P.r3(plate_line), knobs=P.r3(C_PTS[1:]), switch=list(C_PTS[0]),
    strings=[[[0.0, round(Y_BRIDGE[i], 3)], [NK.NUT_X0, round(NK.y_nut[i], 3)]] for i in range(6)],
    gauges=P.GAUGE, departures=departures,
)
json.dump(page, open(os.path.join(ROOT, 'site', 'assets', 'data', f'{ID}.json'), 'w'))

if '--no-export' not in ARGS:
    P.export(rootob, G, OUT_GLB, os.path.join(HERE, f'{ID}.blend'))
else:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, f'{ID}.blend'))
