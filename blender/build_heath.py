"""KVELD Heath: a contoured double-cut built from the Stratocaster plans.

  blender -b -P blender/build_heath.py -- [--render] [--no-export]

Dimensions come from reference/strat/parsed/strat.json (tools/extract_strat.py):
the body outline and its contours from the 1:1 body sheets (which match the
1962 Fender drawing), the pickup, knob and bridge positions from the 1:1
assembled sheet. 25.5 in scale, 21 frets, 7.25 in radius, 1.650 in nut,
1.75 in alder body with 1/2 in edges and 5/8 in left at the contoured edges.

KVELD's own: the headstock, logo and markers (shared with the range), and on
this body: both horns shorter and rounder, the guard redrawn with seven screws
and no controls on it, the controls moved to a chrome plate of their own
along the lower bout, and the jack moved from the top to the rim.
"""
import json, math, os, sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kveld_kit as K                    # noqa: E402
import kveld_parts as P                  # noqa: E402
from kveld_kit import IN, principled, srgb, slab, lathe, place, tube, rounded_rect, stadium, catmull, merge, transform_obj, ccw, vnormals  # noqa: E402

ROOT = K.ROOT
D = json.load(open(os.path.join(ROOT, 'reference', 'strat', 'parsed', 'strat.json')))
T = json.load(open(os.path.join(ROOT, 'reference', 'telecaster', 'parsed', 'tele.json')))     # the Fender neck
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ID = 'heath'
OUT_GLB = os.path.join(ROOT, 'site', 'assets', 'models', f'{ID}.glb')
OUT_TEX = os.path.join(HERE, 'textures')
OUT_RENDER = os.path.join(HERE, 'renders', ID)

SCALE = 25.5
RADIUS = 7.25
Z_BOARD = 1.01 - 0.625            # board crown: a 1.0 in heel in a 5/8 pocket, as on Floe
BOARD_T = 0.27                    # rosewood slab, at the centre (0.19 at the edges)
BODY_T = 1.75
NUT_X0, NUT_X1 = SCALE, SCALE + 0.12
NUT_HALF = 0.826
N_FRETS = 21
H_NUT, H_SADDLE = 0.058, 0.148
Y_NUT = [0.705 - i * 0.282 for i in range(6)]
Y_BRIDGE = [1.11 - i * 0.444 for i in range(6)]          # vintage tremolo, 2-7/32 in E to E (the 62 sheet)


def board_z(y):
    return Z_BOARD - (RADIUS - math.sqrt(RADIUS * RADIUS - y * y))


def string_y(i, x):
    return Y_BRIDGE[i] + (Y_NUT[i] - Y_BRIDGE[i]) * x / SCALE


scene = K.begin('Heath')
M = P.house_materials()
os.makedirs(OUT_TEX, exist_ok=True)

# ------------------------------------------------------------ materials ----
NECK_U0, NECK_US = 6.9, 26.4
rose_png = P.rosewood_png(os.path.join(OUT_TEX, 'heath_rosewood.png'), NECK_U0, NECK_US)
M_PAINT = principled('Body_Alder_HeatherPurple', srgb((0.43, 0.28, 0.52)), 0.3, metal=0.25, coat=1.0, coat_rough=0.02)
M_NECK = principled('Neck_Maple', (1, 1, 1), 0.32, coat=1.0, coat_rough=0.032, tex=os.path.join(OUT_TEX, 'floe_maple.png'))
M_BOARD = principled('Board_Rosewood', (1, 1, 1), 0.48, tex=rose_png)

# ---------------------------------------------------------------- body ----
plan_body = [tuple(p) for p in D['body_outline']]
body_pts = plan_body[::2]
# KVELD: both horns a little shorter and rounder
bass_tip = max((p for p in body_pts if p[1] > 2), key=lambda p: p[0])
treb_tip = max((p for p in body_pts if p[1] < -3), key=lambda p: p[0])
body_pts = P.reshape_horn(body_pts, bass_tip, 0.38, radius=2.0, round_r=1.0, rounds=14)
body_pts = P.reshape_horn(body_pts, treb_tip, 0.26, radius=1.7, round_r=0.9, rounds=12)
# the two corners at the end of the body, beside the neck, eased a touch (the
# neck plate sits 0.04 in inside them, so only a touch), and the edge there
# made smaller in r_fn: the 1/8 in edge was wider than the corners it wrapped
# round and folded (a jagged notch from behind)
_end_x = max(p[0] for p in body_pts if abs(p[1]) < 0.5)
for cy in (0.97, -1.0):
    body_pts = P.relax(body_pts, (_end_x - 0.05, cy), 0.12, rounds=6)
dev = P.departure(body_pts, plan_body)
edge = P.Edge(body_pts)

pocket = D['neck_pocket']
# The contours as drawn on the body sheets (the line where each starts to fall),
# built as bands along the rim: as wide as the drawn line is from the edge,
# easing in and out along their length, rolling from level to full depth at
# the rim. (As a fall-off from the line itself each read as a flat cut.)
def band_fn(line, side, depth, blur, w_full):
    a_ = np.array(line, float)
    seg = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(a_, axis=0).T))])
    t = np.linspace(0, seg[-1], int(seg[-1] / 0.05) + 2)
    line = list(zip(np.interp(t, seg, a_[:, 0]), np.interp(t, seg, a_[:, 1])))
    return P.SmoothGrid(lambda X, Y: P.edge_band_grid(body_pts, [], depth, X, Y, soft=0.25, win=1.6, w_ref=w_full, power=1.7,
                                                      w_fn=P.line_widths(line, side)), body_pts, step=0.035, blur=blur)


# w_full: the depth grows with the band's width and is only full where the band is
# at its widest, as a cut made on one plane is. (Full depth as soon as the band
# was 0.8 in wide, both faces fell an inch within an inch of rim: a Z in the waist.)
arm = band_fn(D['arm_contour']['outer'], 1, 1.125, 8, 2.9)
belly = band_fn(D['belly_contour'], -1, 1.125, 16, 2.6)
MIN_T = 0.62                     # the 62 sheet leaves 5/8 at a contoured edge


def top_fn(x, y):
    return -arm(x, y)


def back_fn(x, y):
    zb = -BODY_T + belly(x, y)
    zt = top_fn(x, y)
    return -P.smax(-zb, -(zt - MIN_T), 0.3)          # never thinner than MIN_T, eased (a hard min left a crease)


def r_fn(p, i):
    """1/8 in round the neck pocket, 1/2 in everywhere else (the 62 sheet),
    growing smoothly between them over an inch of rim (switched at a hard
    boundary the roundover stepped on both cutaways)."""
    x, y = p
    x0 = pocket['x_floor'] + 2.0
    d = math.hypot(max(x0 - x, 0.0), max(abs(y) - (pocket['half_width'] + 0.05), 0.0))
    end = P.smoothstep(_end_x - 0.9, _end_x - 0.35, x) if abs(y) < pocket['half_width'] + 0.1 else 0.0
    return (0.25 - 0.11 * end) + 0.75 * P.smoothstep(0.02, 1.1, d)


if os.environ.get('DUMP'):
    xs_ = [p[0] for p in body_pts]; ys_ = [p[1] for p in body_pts]
    GX, GY = np.meshgrid(np.arange(min(xs_), max(xs_), 0.03), np.arange(min(ys_), max(ys_), 0.03))
    ins = P.inside(GX.ravel(), GY.ravel(), body_pts).reshape(GX.shape)
    for nm, fn in (('top', top_fn), ('back', back_fn)):
        H = np.array([[fn(x, y) for x in GX[0]] for y in GY[:, 0]])
        gy, gx = np.gradient(H, 0.03)
        lap = np.abs(np.gradient(gx, 0.03, axis=1) + np.gradient(gy, 0.03, axis=0))
        c = np.clip(lap / 4.0, 0, 1) * ins
        K.save_png(np.stack([c, c, c * 0.6 + 0.25 * (~ins)], -1)[::-1], os.environ['DUMP'] + '_' + nm + '_curv.png')

body = P.body_shell('Body', body_pts, top_fn, back_fn, M_PAINT, r_top=0.5, r_bot=0.5, steps=10, grid=0.07, grid_top=0.06,
                    top_rings=2.4, back_rings=2.4, smooth_edge=20, follow_slope=True, r_fn=r_fn, uv_origin=(-5.95, -8.25), uv_size=16.5)

if os.environ.get('DBG_END'):
    R_ = rounded_rect(8.75, 0, 2.52, 2.02, 0.22)
    rx = np.array([p[0] for p in R_]); ry = np.array([p[1] for p in R_])
    print('[end] plate outside %d nearest rim %.3f' % (int((~P.inside(rx, ry, body_pts)).sum()), float(P._dist_to_poly(rx, ry, body_pts).min())))
    print('[end] corners', [(round(p[0], 2), round(p[1], 2)) for p in body_pts if p[0] > _end_x - 0.3 and abs(p[1]) > 0.6 and abs(p[1]) < 1.2])

# ----------------------------------------------------------------- neck ----
nw = sorted(T['neck_width'])
WX = np.array([p[0] for p in nw]); WL = np.array([p[1] for p in nw]); WR = np.array([p[2] for p in nw])
pr = sorted(T['neck_profile'])
PX = np.array([p[0] for p in pr]); PTOP = np.array([p[1] for p in pr]); PBACK = np.array([p[2] for p in pr])
HEEL_X = pocket['x_floor']
BASS, TREB, HS_TIP, bass_edge, treb_edge = P.six_head_edges(NUT_X0)


def width(x):
    if x <= NUT_X0:
        return float(np.interp(x, WX, WL)), float(np.interp(x, WX, WR))
    if x <= NUT_X1:
        return -NUT_HALF, NUT_HALF
    return TREB(x), BASS(x)


def top(x):
    z = Z_BOARD + float(np.interp(x, PX, PTOP))
    return min(z, Z_BOARD - BOARD_T) if x > NUT_X0 else Z_BOARD - BOARD_T


def blend(a, b, t):
    t = min(max(t, 0), 1); t = t * t * (3 - 2 * t); return a + (b - a) * t


def carve(x):
    if x < 11.2:
        return blend(9.0, 2.35, (x - 10.1) / 1.1)
    if x > 24.0:
        return blend(2.35, 9.0, (x - 24.0) / 1.9)
    return 2.35


S = P.NeckSpec(width=width, top=top, back=lambda x: Z_BOARD + float(np.interp(x, PX, PBACK)), carve=carve,
               sag=lambda x: 0.0, rs=lambda x: blend(0.012, 0.07, (x - NUT_X1) / 0.6), radius=RADIUS)
stations = P.stations_between(HEEL_X + 0.002, HS_TIP + NUT_X0 - 0.004,
                              fine=[(HEEL_X, HEEL_X + 0.4, 0.02), (NUT_X0 - 0.3, NUT_X0 + 1.6, 0.04), (HS_TIP + NUT_X0 - 0.5, 99, 0.02)])
neck = P.loft('Neck', stations, lambda x: P.neck_section(S, x)[0], M_NECK, NECK_U0, NECK_US, 5.0)

board = P.fretboard('Fretboard', lambda x: width(min(x, NUT_X0)), RADIUS, Z_BOARD, Z_BOARD - BOARD_T, HEEL_X + 0.002, NUT_X0,
                    M_BOARD, u0=NECK_U0, us=NECK_US)
FRET_X = P.fret_positions(SCALE, N_FRETS)
frets = P.frets('Frets', FRET_X, width, RADIUS, Z_BOARD, M['fret'])
marks = P.marker_positions(SCALE, N_FRETS)
dots = P.dots(marks, RADIUS, Z_BOARD, M['dot_pearl'], M['dot_pearl'], side_y=lambda x: width(x)[1],
              side_z=lambda x: Z_BOARD - 0.13)
nut = P.nut('Nut', NUT_X0, NUT_X1, NUT_HALF, RADIUS, Z_BOARD, H_NUT, Z_BOARD - BOARD_T - 0.02, M['bone'])

# ------------------------------------------------------------- headstock ----
FACE_Z = Z_BOARD + float(np.interp(NUT_X0 + 3, PX, PTOP))
BACK_Z = Z_BOARD + float(np.interp(NUT_X0 + 3, PX, PBACK))
HEAD = Matrix.Translation((0, 0, FACE_Z * IN))
tuners = []
turns = (17, -24, 9, -13, 26, -6)
for i, (hx, hy) in enumerate(P.SIX_POSTS):
    tuners += P.tuner(i, NUT_X0 + hx, hy, +1, BACK_Z - FACE_Z, M, frame=HEAD, turn=math.radians(turns[i]))
logo = P.logo(P.BRAND, 0.272, 1.22, M['logo_black'], (27.82, -0.64, 0.003), frame=HEAD)

# --------------------------------------------------------------- bridge ----
XF = D['pivot_x'] + 0.10                      # plate front edge, just ahead of the six pivot screws
COMP = [-0.10, -0.075, -0.05, -0.065, -0.04, 0.0]
crest = [(COMP[i], board_z(Y_BRIDGE[i]) + H_SADDLE) for i in range(6)]
bridge_bits, saddles = P.vintage_trem(XF, Y_BRIDGE, crest, M, arm_dir=(-0.5, -0.87))
arm_parts = bridge_bits[-2:]
bridge_bits = bridge_bits[:-2]

# -------------------------------------------------------------- pickups ----
GUARD_T = 0.09
pu = {}
for tag, (cx, ang) in {'NeckPickup': (6.172, 0.0), 'MiddlePickup': (3.823, 0.0), 'BridgePickup': (1.5997, math.radians(-10.0))}.items():
    ys = [string_y(i, cx) for i in range(6)]
    pu[tag] = P.single_coil(tag.lower(), cx, 0.0, ang, ys, GUARD_T, M, M['parchment'],
                            stagger=(0.03, 0.034, 0.046, 0.04, 0.028, 0.026) if tag != 'MiddlePickup' else (0.03, 0.034, 0.046, 0.04, 0.028, 0.026))

# -------------------------------------------------------------- the guard ----
# KVELD's guard: the original's pickup area, kept clear of the controls, which
# now have their own plate. Seven screws instead of eleven.
GUARD_CTRL = [(7.30, -1.13), (7.02, -1.80), (6.98, -2.60), (7.30, -3.30), (7.85, -3.85), (8.45, -4.12), (8.55, -4.42), (8.05, -4.62),
              (7.10, -4.55), (6.00, -4.20), (4.90, -3.80), (3.95, -3.40), (3.10, -2.95), (2.35, -2.55), (1.60, -2.12),
              (0.95, -1.82), (0.48, -1.62), (0.40, -1.00), (0.40, 0.60), (0.44, 1.36), (0.10, 1.62), (0.05, 2.12),
              (0.52, 2.62), (1.40, 2.90), (2.70, 2.80), (4.20, 2.28), (5.60, 1.97), (6.90, 1.96), (7.90, 2.08), (8.42, 1.86),
              (8.40, 1.30), (8.20, 1.13), (7.40, 1.12), (7.15, 0.85), (7.10, 0.0), (7.15, -0.85)]
guard_line = catmull(GUARD_CTRL, per=10)
g_bot = slab('guard_ply1', guard_line, 0.0, 0.045, M['parchment'], uv_origin=(-5.95, -8.25), uv_size=16.5)


def inset(poly, d):
    poly = ccw(list(poly)); n = vnormals(poly)
    return [(p[0] - q[0] * d, p[1] - q[1] * d) for p, q in zip(poly, n)]


g_mid = slab('guard_ply2', inset(guard_line, 0.014), 0.045, 0.064, M['plastic'])
g_top = slab('guard_ply3', inset(guard_line, 0.03), 0.064, GUARD_T, M['parchment'], r_top=0.012, steps=2)
gpoly = ccw(list(guard_line)); gn = vnormals(gpoly)
screws = []
for k, frac in enumerate((0.02, 0.17, 0.33, 0.47, 0.62, 0.80, 0.93)):
    i = int(frac * len(gpoly))
    p, q = gpoly[i], gn[i]
    screws.append(P.screw(f'pg_screw_{k}', (p[0] - q[0] * 0.2, p[1] - q[1] * 0.2, GUARD_T), M))

# ------------------------------------------------------------- controls ----
# the switch and three knobs on one chrome plate, following the lower bout
C_PTS = [(2.45, -3.45), (1.35, -4.10), (0.15, -4.62), (-1.10, -4.98)]
c_line = catmull(C_PTS, per=12, closed=False)


def band(line, hw):
    L = [Vector((x, y)) for x, y in line]
    left, right = [], []
    for k, p in enumerate(L):
        t = (L[min(k + 1, len(L) - 1)] - L[max(k - 1, 0)]).normalized()
        nrm = Vector((-t.y, t.x))
        left.append(p + nrm * hw); right.append(p - nrm * hw)
    t0 = (L[1] - L[0]).normalized(); t1 = (L[-1] - L[-2]).normalized()
    cap0 = [L[0] + (Vector((-t0.y, t0.x)) * math.cos(a) - t0 * math.sin(a)) * hw for a in np.linspace(0, math.pi, 14)[1:-1]]
    cap1 = [L[-1] + (Vector((t1.y, -t1.x)) * math.cos(a) + t1 * math.sin(a)) * hw for a in np.linspace(0, math.pi, 14)[1:-1]]
    pts = right + cap1 + left[::-1] + cap0
    return [(p.x, p.y) for p in pts]


plate_line = band(c_line, 0.6)
ctrl = [slab('ControlPlate', plate_line, 0.0, 0.06, M['chrome'], r_top=0.02, steps=3)]
for k, (x, y) in enumerate(C_PTS[1:]):
    ctrl.append(P.knob(k, x, y, 0.0, M, spin=0.4 * k))
sx, sy = C_PTS[0]
t0 = Vector(C_PTS[0]) - Vector(C_PTS[1])
ctrl += P.blade_switch(sx, sy, 0.06, M, angle=math.atan2(t0.y, t0.x), throw=-0.12)
plate_screws = []
for k in (0.06, 0.94):
    i = int(k * (len(c_line) - 1))
    p = c_line[i]
    plate_screws.append(P.screw(f'cp_screw_{k}', (p[0], p[1], 0.06), M, d=0.17, h=0.04))
# the lowest knob sits a hair further out, so screws go inside the band's ends
screws += pu['NeckPickup'][-2:] + pu['MiddlePickup'][-2:] + pu['BridgePickup'][-2:] + plate_screws
for t in ('NeckPickup', 'MiddlePickup', 'BridgePickup'):
    pu[t] = pu[t][:-2]

# ------------------------------------------------- jack, straps, back ----
back_bits = []
jp, jn, _ = P.outline_point(body_pts, (-2.9, -6.2))
back_bits += P.edge_jack(jp, jn, -BODY_T / 2, M)
tail_p, tail_n, _ = P.outline_point(body_pts, (-6.0, 0.0))
horn_p = max(ccw(list(body_pts)), key=lambda p: p[0] if p[1] > 2 else -99)
hp, hn, _ = P.outline_point(body_pts, horn_p)
back_bits.append(P.strap_button('strap_tail', tail_p, tail_n, -BODY_T / 2, M))
back_bits.append(P.strap_button('strap_horn', hp, hn, -BODY_T / 2 + 0.1, M))
NS = [(7.745, 0.75), (7.745, -0.75), (9.745, 0.75), (9.745, -0.75)]
back_bits += P.neck_plate(7.745, 9.745, NS, -BODY_T, M)
# tremolo cover: the original's size, six string holes over the block
cov_c = (1.35, 0.0)
back_bits.append(slab('trem_cover', rounded_rect(cov_c[0], cov_c[1], 4.70, 3.25, 0.32), -BODY_T - 0.08, -BODY_T, M['parchment'], r_bot=0.02, steps=2))
for i, y in enumerate(Y_BRIDGE):
    h = slab(f'cover_hole_{i}', stadium(-0.80, y, 0.34, 0.2), -BODY_T - 0.0815, -BODY_T - 0.081, M['hole'])
    back_bits.append(h)
for k, (x, y) in enumerate([(-0.75, 1.42), (-0.75, -1.42), (1.35, 1.42), (1.35, -1.42), (3.45, 1.42), (3.45, -1.42)]):
    back_bits.append(P.screw(f'cover_screw_{k}', (x, y, -BODY_T - 0.08), M, axis=(0, 0, -1), d=0.17, h=0.04))

# -------------------------------------------------------------- strings ----
tree_x = 28.95
tree_y = None
strings = []
for i in range(6):
    r = P.GAUGE[i] / 2
    xc, zc = crest[i]
    yb = Y_BRIDGE[i]
    z_n = board_z(Y_NUT[i]) + H_NUT
    # up out of the plate behind the saddle, over its rear bend, along the top to the crest
    xr = xc - 0.92
    path = [(xr - 0.02, yb, 0.075), (xr + 0.012, yb, zc - 0.06 - 0.03 + r), (xr + 0.06, yb, zc - 0.06 + r + 0.001),
            (xc, yb, zc + r), (NUT_X0, Y_NUT[i], z_n + r), (NUT_X1, Y_NUT[i], z_n + r - 0.012)]
    hx, hy = P.SIX_POSTS[i]
    px, py = NUT_X0 + hx, hy
    if i in (4, 5):
        # under the string tree
        t = (tree_x - NUT_X1) / (px - NUT_X1)
        ty_ = Y_NUT[i] + (py - Y_NUT[i]) * t
        path.append((tree_x, ty_, FACE_Z + 0.13 + r))
        tree_y = ty_ if tree_y is None else (tree_y + ty_) / 2
    wrap_z = 0.10 + (0.16 if i in (4, 5) else 0.05 + 0.03 * i)
    Fin = Matrix.Translation((0, 0, FACE_Z))
    strings.append(P.string_run(i, path, (px, py), 0.118, wrap_z, M, frame=Fin))
tree_base = lathe('tree_base', [(0, 0.13), (0.06, 0.13), (0.06, 0.0), (0, 0.0)], M['chrome'], seg=16)
tuners.append(place(tree_base, (tree_x, tree_y, FACE_Z)))
tuners.append(slab('tree_wing', rounded_rect(tree_x, tree_y, 0.16, 0.46, 0.07), FACE_Z + 0.13 + 0.0115, FACE_Z + 0.16, M['chrome'], r_top=0.01, steps=2))
tuners.append(P.screw('tree_screw', (tree_x, tree_y, FACE_Z + 0.16), M, d=0.12, h=0.03))

# --------------------------------------------------------------- groups ----
G = {}
G['Body'] = body
G['Pickguard'] = merge('Pickguard', [g_bot, g_mid, g_top])
G['Screws'] = merge('Screws', screws)
for t in ('NeckPickup', 'MiddlePickup', 'BridgePickup'):
    G[t] = merge(t, pu[t])
G['Bridge'] = merge('Bridge', bridge_bits)
G['Saddles'] = merge('Saddles', saddles)
G['Tremolo'] = merge('Tremolo', arm_parts)
G['Controls'] = merge('Controls', ctrl)
G['BackHardware'] = merge('BackHardware', back_bits)
G['Neck'] = neck
G['Fretboard'] = board
G['Frets'] = frets
G['Dots'] = merge('Dots', dots)
G['Nut'] = nut
G['Tuners'] = merge('Tuners', tuners)
G['Logo'] = logo
G['Strings'] = merge('Strings', strings)

tail_x = min(p[0] for p in body_pts)
rootob = P.assemble('Heath', G, tail_x, -BODY_T / 2)
print(f'[heath] objects {len(G)}, polygons {sum(len(o.data.polygons) for o in G.values())}')
bd = Vector(body.dimensions) / IN
print(f'[heath] body {bd.x:.3f} x {bd.y:.3f} x {bd.z:.3f} in')

# where KVELD departs from the drawing, for the README and the video
pb = np.array(plan_body)
def dev_near(pt, r=1.2):
    sel = [d for p, d in zip(body_pts, dev) if math.dist(p, pt) < r]
    return round(max(sel) * 25.4, 1) if sel else 0.0
departures = dict(bass_horn_mm=dev_near(bass_tip), treble_horn_mm=dev_near(treb_tip),
                  elsewhere_max_mm=round(max(d for p, d in zip(body_pts, dev) if math.dist(p, bass_tip) > 2.6 and math.dist(p, treb_tip) > 2.4) * 25.4, 2))
print('[heath] departures from the plan outline', departures)

# ------------------------------------------------------------- page data ----
neck_loop = ([(x, yr) for x, yr in zip(WX, WR)]
             + [(NUT_X0 + p[0], p[1]) for p in bass_edge] + [(NUT_X0 + p[0], p[1]) for p in treb_edge[::-1]]
             + [(x, yl) for x, yl in zip(WX[::-1], WL[::-1])])
page = dict(
    units='inch', brand=P.BRAND, model='Heath', scale=SCALE, radius=RADIUS, frets=N_FRETS, nut_width=round(2 * NUT_HALF, 3),
    body=dict(length=round(bd.x, 3), width=round(bd.y, 3), depth=BODY_T),
    neck_length=round(D['neck_length'], 3), headstock_length=round(HS_TIP, 3),
    overall=round(HS_TIP + NUT_X0 - tail_x, 3),
    body_outline=P.r3(body_pts[::2]), plan_outline=P.r3(plan_body[::4]), pickguard=P.r3(guard_line[::2]), pickguard_slot=[],
    neck=P.r3(neck_loop[::2]), fret_x=[round(x, 3) for x in FRET_X],
    fret_span=[[round(width(x)[0], 3), round(width(x)[1], 3)] for x in FRET_X],
    nut=[NUT_X0, NUT_X1, NUT_HALF], posts=P.r3([(NUT_X0 + a, b) for a, b in P.SIX_POSTS]), dots=P.r3(marks),
    bridge_plate=P.r3(rounded_rect((XF - 1.73 + XF) / 2, 0, 1.73, 2.86, 0.08)),
    pickups=[dict(kind='single', x=6.172, y=0, angle=0), dict(kind='single', x=3.823, y=0, angle=0), dict(kind='single', x=1.5997, y=0, angle=-10)],
    control_plate=P.r3(plate_line), knobs=P.r3(C_PTS[1:]), switch=list(C_PTS[0]),
    strings=[[[round(crest[i][0], 3), round(Y_BRIDGE[i], 3)], [NUT_X0, round(Y_NUT[i], 3)]] for i in range(6)],
    gauges=P.GAUGE, departures=departures,
)
os.makedirs(os.path.join(ROOT, 'site', 'assets', 'data'), exist_ok=True)
json.dump(page, open(os.path.join(ROOT, 'site', 'assets', 'data', f'{ID}.json'), 'w'))

if '--no-export' not in ARGS:
    P.export(rootob, G, OUT_GLB, os.path.join(HERE, f'{ID}.blend'))
else:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, f'{ID}.blend'))

if '--render' in ARGS:
    OUT_RENDER = OUT_RENDER
    exec(open(os.path.join(HERE, 'render_views.py')).read())
