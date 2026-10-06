"""KVELD Scree: a bevelled twin-horn built from the SG plans.

  blender -b -P blender/build_scree.py -- [--no-export]

Dimensions from reference/sg/parsed/sg.json (tools/extract_sg.py): the body,
its bevel lines and the controls from the 1:1 template; the scale (24.75 in),
the slanted bridge and the stopbar from the 1:1 plans in mm. Body 35 mm,
neck pitched 2 degrees and the head 13 degrees, as the plans' sections give.

KVELD's own: the three-a-side headstock (black veneer, bone logo), the markers,
the shared tuners and knobs, and on this body:
  - both horns blunter, less pointed
  - the waists reshaped: filled out on both sides
  - a small guard round the pickups instead of the large one
  - the jack in the rim, the strap button on the bass horn
Judged: the bevel depth (0.42 in at the rim) and the board height at the joint.
"""
import json, math, os, sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kveld_kit as K                    # noqa: E402
import kveld_parts as P                  # noqa: E402
from kveld_kit import IN, principled, srgb, slab, lathe, place, rounded_rect, catmull, merge, ccw, ellipse  # noqa: E402

ROOT = K.ROOT
D = json.load(open(os.path.join(ROOT, 'reference', 'sg', 'parsed', 'sg.json')))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ID = 'scree'
OUT_GLB = os.path.join(ROOT, 'site', 'assets', 'models', f'{ID}.glb')
OUT_TEX = os.path.join(HERE, 'textures')
BODY_T = D['body_t']
UV0, UVS = (-8.25, -8.25), 16.5
SLATE = (0.36, 0.66, 1.30)              # dark slate stain over the mahogany

scene = K.begin('Scree')
M = P.house_materials()
os.makedirs(OUT_TEX, exist_ok=True)
rose_png = os.path.join(OUT_TEX, 'heath_rosewood.png')
body_png = P.mahogany_png(os.path.join(OUT_TEX, 'scree_body.png'), UV0[0], UVS, w=2048, h=2048, vs=UVS, seed=41, tint=SLATE)
neck_png = P.mahogany_png(os.path.join(OUT_TEX, 'scree_neck.png'), 2.8, 30.0, w=2048, h=512, vs=5.0, seed=43, tint=SLATE)
M_BODY = principled('Body_Mahogany_Slate', (1, 1, 1), 0.32, coat=1.0, coat_rough=0.02, tex=body_png)
M_NECK = principled('Neck_Mahogany_Slate', (1, 1, 1), 0.32, coat=1.0, coat_rough=0.03, tex=neck_png)
M_BOARD = principled('Board_Rosewood', (1, 1, 1), 0.48, tex=rose_png)
M_VENEER = principled('Veneer_Black', srgb((0.012, 0.012, 0.014)), 0.3, coat=1.0, coat_rough=0.02)
M_WHITE = principled('Plastic_White', srgb((0.90, 0.89, 0.85)), 0.3)

# ---------------------------------------------------------------- body ----
plan_body = [tuple(p) for p in D['body_outline']]
body_pts = plan_body[::2]
bass_tip = max((p for p in body_pts if p[1] > 2), key=lambda p: p[0])
treb_tip = max((p for p in body_pts if p[1] < -2), key=lambda p: p[0])
bass_waist = min((p for p in body_pts if p[1] > 2 and -3 < p[0] < 3), key=lambda p: p[1])
treb_waist = max((p for p in body_pts if p[1] < -2 and -3 < p[0] < 3), key=lambda p: p[1])
body_pts = P.reshape_horn(body_pts, bass_tip, 0.50, radius=1.7, round_r=1.7, rounds=40)
body_pts = P.reshape_horn(body_pts, treb_tip, 0.46, radius=1.7, round_r=1.7, rounds=40)
# round the horn tips off properly (the light pass above left a 0.05 in point
# that showed as a crease down the rim): about 0.2 in radius at the tip
for t in (bass_tip, treb_tip):
    body_pts = P.relax(body_pts, (t[0] - 0.5, t[1]), 0.9, rounds=800)
body_pts = P.push(body_pts, bass_waist, 2.4, (0.0, 0.26))
body_pts = P.push(body_pts, treb_waist, 2.4, (0.0, -0.26))
for cy in (1.07, -1.07):
    body_pts = P.relax(body_pts, (max(p[0] for p in body_pts if abs(p[1]) < 0.8), cy), 0.35, rounds=10)
dev = P.departure(body_pts, plan_body)
edge = P.Edge(body_pts)

# bevels along the drawn lines: straight chamfers, 0.42 in deep at the rim (judged)
BEVEL = 0.42
bevel_fns, bevel_args = [], []
for name, line in D['bevels'].items():
    mid = line[len(line) // 2]
    a, b = line[len(line) // 2 - 1], line[len(line) // 2 + 1]
    e, _, _ = P.outline_point(body_pts, mid)
    side = 1 if (b[0] - a[0]) * (e[1] - a[1]) - (b[1] - a[1]) * (e[0] - a[0]) > 0 else -1
    bevel_fns.append(P.contour_fn(edge, line, BEVEL, power=1.0, side=side, taper=0.08))
    bevel_args.append((line, side))


# the bevels meet the top in a slightly softened crease, as a sanded bevel
# does, resampled fine: a hard crease across the mesh triangles read as a staircase
# The bevels as an even band along the rim, as wide as the drawn bevel lines
# are from the edge, smoothed along it, fading out before the neck joint so the
# neck rises from a clean shoulder.
JOINT_X = max(p[0] for p in body_pts if abs(p[1]) < 0.8)
# and easing off toward each horn tip, where the bands from both sides of the
# horn would otherwise meet in a creased ridge
tips = [max((p for p in body_pts if p[1] > 2), key=lambda p: p[0]), max((p for p in body_pts if p[1] < -2), key=lambda p: p[0])]
FADES = [((JOINT_X, 1.08), 1.1), ((JOINT_X, -1.08), 1.1)] + [(t, 1.2) for t in tips]
top_fn = P.SmoothGrid(lambda X, Y: -P.edge_band_grid(body_pts, list(D['bevels'].values()), BEVEL, X, Y, fades=FADES,
                                                     soft=0.16, win=1.2), body_pts, step=0.025, blur=6)

if os.environ.get('DUMP'):
    # a relief of the carve, lit low from four sides, for checking creases by eye
    import numpy as np
    H = top_fn.H
    gy, gx = np.gradient(H, top_fn.step)
    lap = np.abs(np.gradient(gx, top_fn.step, axis=1) + np.gradient(gy, top_fn.step, axis=0))
    img = np.zeros(H.shape + (3,))
    for k, (lx, ly) in enumerate([(1, 0), (0, 1), (-1, 0.3)]):
        n = np.stack([-gx, -gy, np.ones_like(H)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
        img[..., k] = np.clip(n @ np.array([lx * 0.8, ly * 0.8, 0.6]) / 1.0, 0, 1)
    K.save_png(img[::-1], os.environ['DUMP'] + '_relief.png')
    c = np.clip(lap / 8.0, 0, 1)
    K.save_png(np.stack([c, c, c], -1)[::-1], os.environ['DUMP'] + '_curv.png')


def back_fn(x, y):
    return -BODY_T


body = P.body_shell('Body', body_pts, top_fn, back_fn, M_BODY, r_top=0.06, r_bot=0.10, steps=6, grid=0.12, grid_top=0.05, top_rings=1.8,
                    uv_origin=UV0, uv_size=UVS)

# ----------------------------------------------------------------- neck ----
NK = P.SetNeck(M, M_BOARD, M_NECK, scale=24.75, radius=12.0, frets=22, nut_half=0.8475, heel_half=1.10, board_t=0.25,
               z_board=0.40, x_joint=D['neck_joint_x'], board_end=D['neck_joint_x'] - 0.33, x_heel=3.6,
               pitch=D['neck_pitch_deg'], head_pitch=D['head_pitch_deg'], bind=0.06, bind_mat=M['binding'],
               veneer_mat=M_VENEER, logo_mat=M['logo_bone'])
G = NK.build()

# --------------------------------------------------------------- bridge ----
Y_BRIDGE = [1.025 - i * 0.41 for i in range(6)]
posts = [tuple(p) for p in D['tom_posts']]
(bx, by), (tx, ty) = posts
xline = lambda y: tx + (y - ty) * (bx - tx) / (by - ty)
COMP = [-0.03, -0.01, 0.03, 0.0, 0.01, 0.04]
crests = []
for i, y in enumerate(Y_BRIDGE):
    p = NK.to_body((xline(y) + COMP[i], y, NK.board_z(y) + 0.148))
    crests.append((p[0], p[2]))
tom, tom_saddles = P.tune_o_matic(posts, crests, Y_BRIDGE, M)
studs = [tuple(p) for p in D['stop_studs']]
stop, (sx, sz) = P.stopbar(studs, M, height=0.18)
Y_ANCHOR = [1.0 - i * 0.40 for i in range(6)]
anchors = [[(sx - 0.03, Y_ANCHOR[i], sz)] for i in range(6)]
G['Strings'] = merge('Strings', NK.strings(anchors, crests, Y_BRIDGE))

# ---------------------------------------------------------------- guard ----
# ---- the guard: KVELD's own, round both pickups, drawn to sit balanced ----
# Mirror-symmetric about the strings, so the space beside the pickups is the
# same on both sides. Its sides echo the body's waist (a tenth of the body's
# own change in width, narrowest where the body is), its top corners follow
# the cutaway bevels at a constant distance, and the whole line is smoothed so
# its curvature changes gently all the way round.
NECK_PU, BRIDGE_PU = max(D['pickups'])[0], min(D['pickups'])[0]
RING_HX, RING_HY = 0.78, 3.45 / 2


def rim_half(x):
    """The body's half-width at x beside the pickups (both rims averaged)."""
    out = []
    for sy in (1, -1):
        ys = [abs(p[1]) for p in body_pts if abs(p[0] - x) < 0.06 and sy * p[1] > 2.3]
        if ys:
            out.append(min(ys))
    return sum(out) / len(out)


XS_ = np.arange(-0.5, 5.81, 0.1)
RIM_ = np.array([rim_half(x) for x in XS_])
for _ in range(20):                                    # smooth the rim reading itself
    RIM_[1:-1] = 0.25 * RIM_[:-2] + 0.5 * RIM_[1:-1] + 0.25 * RIM_[2:]
WAIST = RIM_.min()


def side(x):
    return 2.0 + 0.10 * (float(np.interp(x, XS_, RIM_)) - WAIST)


def flat_to(y):
    """How far up the body the top stays flat at |y|: the tighter of the two sides."""
    lim = []
    for sy in (1, -1):
        x = 4.8                                       # walk up the body until the top falls away or the body ends
        while x < 6.9 and top_fn(x + 0.005, sy * y) > -0.002 and P.inside(np.array([x + 0.005]), np.array([sy * y]), body_pts)[0]:
            x += 0.005
        lim.append(x)
    return min(lim)


G_TOP, G_BOT, CUT_M = 6.12, BRIDGE_PU - RING_HX - 0.24, 0.07
half = [(G_TOP, 0.0), (G_TOP, 0.6), (G_TOP - 0.01, 1.0)]
y = 1.05
while True:                                            # the top corner, along the cutaway
    x = min(G_TOP - 0.02 * (y - 1.0), flat_to(y) - CUT_M)
    if y >= side(x):
        break
    half.append((x, y)); y += 0.05
x = half[-1][0] - 0.15
while x > G_BOT + 0.55:                                # down the side
    half.append((x, side(x))); x -= 0.15
for k in range(1, 8):                                  # the bottom corner, 0.55 in radius
    a = math.pi / 2 * k / 8
    r = 0.55
    half.append((G_BOT + r - r * math.sin(a), side(G_BOT + r) - r + r * math.cos(a)))
half += [(G_BOT, 0.9), (G_BOT - 0.03, 0.0)]          # a faint bow across the bottom
loop = half[:-1] + [(x, -y) for x, y in half[::-1][1:-1]]
loop = P.resample_poly(ccw(loop), 0.05)
L_ = np.array(loop)
for k in range(120):                                    # gentle curvature all round (Taubin: smooths without shrinking)
    lap = 0.5 * (np.roll(L_, 1, 0) + np.roll(L_, -1, 0)) - L_
    L_ = L_ + (0.5 if k % 2 == 0 else -0.53) * lap
loop = [tuple(p) for p in L_]
guard_line = P.resample_poly(loop, 0.03)
# six screws, mirrored: the top corners, between the pickups, the bottom corners
gp_ = ccw(list(guard_line)); gn_ = P.vnormals(gp_)
guard_holes = []
for tx, ty in ((G_TOP - 0.1, 1.45), (0.5 * (NECK_PU + BRIDGE_PU), 2.2), (G_BOT + 0.25, 1.6)):
    i = min(range(len(gp_)), key=lambda i: math.hypot(gp_[i][0] - tx, gp_[i][1] - ty))
    h = (gp_[i][0] - gn_[i][0] * 0.2, gp_[i][1] - gn_[i][1] * 0.2)
    guard_holes += [h, (h[0], -h[1])]
if os.environ.get('DBG_GUARD'):
    gx = np.array([p[0] for p in guard_line]); gy = np.array([p[1] for p in guard_line])
    out = ~P.inside(gx, gy, body_pts)
    print('[guard] outside the body', int(out.sum()), [(round(a_, 2), round(b_, 2)) for a_, b_ in zip(gx[out], gy[out])][:6])
    deep = [(round(x, 2), round(y, 2), round(top_fn(x, y), 3)) for x, y in guard_line if top_fn(x, y) < -0.004]
    print('[guard] edge over the bevel', len(deep), deep[::max(1, len(deep) // 6)])
    print('[guard] half outline', [(round(a_, 2), round(b_, 2)) for a_, b_ in half])
    print('[guard] deepest top under the edge %.3f in' % min(top_fn(x, y) for x, y in guard_line))
    for nm, cx in (('neck', NECK_PU), ('bridge', BRIDGE_PU)):
        R_ = P.rounded_rect(cx, 0.0, 1.56, 3.45, 0.18)
        rx = np.array([p[0] for p in R_]); ry = np.array([p[1] for p in R_])
        dd_ = P._dist_to_poly(rx, ry, guard_line)
        print('[guard] %s ring margin: bass side %.3f, treble side %.3f, toward %s %.3f' % (nm, dd_[ry > 1.5].min(), dd_[ry < -1.5].min(),
              'the neck' if nm == 'neck' else 'the bridge', dd_[(rx > cx + 0.7) if nm == 'neck' else (rx < cx - 0.7)].min()))
    print('[guard] symmetry: max mirror gap %.4f in' % max(float(P._dist_to_poly(np.array([x]), np.array([-y]), guard_line)[0]) for x, y in guard_line))
    for nm, (x, y), r in [('bass post', posts[0], 0.32), ('treble post', posts[1], 0.32)]:
        print('[guard] %s %.2f in from the edge (needs %.2f)' % (nm, float(P._dist_to_poly(np.array([x]), np.array([y]), guard_line)[0]), r))
    print('[guard] holes', [(round(a_, 2), round(b_, 2)) for a_, b_ in guard_holes])
guard_bits, GUARD_T = P.ply_guard(guard_line, [(0.035, M['plastic']), (0.015, M_WHITE), (0.04, M['plastic'])], uv_origin=UV0, uv_size=UVS)
# where its top corner crosses the first 0.012 in of the cutaway bevel, the
# guard bends down onto the wood, as a screwed-down guard does
for o in guard_bits:
    for v in o.data.vertices:
        w = o.matrix_world @ v.co
        dz = min(0.0, top_fn(w.x / IN, w.y / IN))
        if dz < 0:
            v.co.z += dz * IN
screws = [P.screw(f'pg_screw_{k}', (x, y, GUARD_T), M) for k, (x, y) in enumerate(guard_holes)]

# -------------------------------------------------------------- pickups ----
pu = {}
for tag, (cx, cy) in zip(('BridgePickup', 'NeckPickup'), D['pickups']):
    ys = [Y_BRIDGE[i] + (NK.y_nut[i] - Y_BRIDGE[i]) * cx / NK.scale for i in range(6)]
    nut_pt = NK.to_body((NK.NUT_X0, 0.0, NK.board_z(0.0) + 0.058))
    ring, hb = P.seat_humbucker(tag.lower(), cx, ys, GUARD_T, P.string_z(crests, (nut_pt[0], nut_pt[2]), cx), M,
                                gap=0.13 if tag == 'BridgePickup' else 0.16)
    pu[tag] = ring + hb

# ------------------------------------------------------------- controls ----
ctrl = []
for k, (x, y) in enumerate(D['knobs']):
    ctrl.append(P.knob(k, x, y, -0.055, M, spin=0.4 * k))
tx_, ty_ = D['toggle']
ctrl += P.toggle_switch(tx_, ty_, 0.0, M, lean=(0.0, 0.32))

# ------------------------------------------------- jack, straps, back ----
back_bits = []
jp, jn, _ = P.outline_point(body_pts, (-6.6, -5.0))
back_bits += P.edge_jack(jp, jn, -BODY_T / 2, M)
tail_p, tail_n, _ = P.outline_point(body_pts, (-8.0, 0.0))
hp, hn, _ = P.outline_point(body_pts, max(ccw(list(body_pts)), key=lambda p: p[0] if p[1] > 2 else -99))
back_bits.append(P.strap_button('strap_tail', tail_p, tail_n, -BODY_T / 2, M))
back_bits.append(P.strap_button('strap_horn', hp, hn, -BODY_T / 2, M))
# control cavity cover on the back, round the four pots
kx = [p[0] for p in D['knobs']]; ky = [p[1] for p in D['knobs']]
cov = catmull([(min(kx) - 0.55, (min(ky) + max(ky)) / 2), (min(kx) - 0.2, max(ky) + 0.55), (max(kx) + 0.5, max(ky) + 0.45),
               (max(kx) + 0.75, (min(ky) + max(ky)) / 2), (max(kx) + 0.5, min(ky) - 0.5), (min(kx) - 0.2, min(ky) - 0.55)], per=10)
back_bits.append(slab('cavity_cover', cov, -BODY_T - 0.06, -BODY_T, M['plastic'], r_bot=0.015, steps=2))
for k, f in enumerate((0.0, 0.33, 0.5, 0.83)):
    p = cov[int(f * len(cov))]
    c = (sum(q[0] for q in cov) / len(cov), sum(q[1] for q in cov) / len(cov))
    q = (p[0] + (c[0] - p[0]) * 0.12, p[1] + (c[1] - p[1]) * 0.12)
    back_bits.append(P.screw(f'cov_screw_{k}', (q[0], q[1], -BODY_T - 0.06), M, axis=(0, 0, -1), d=0.15, h=0.035))
back_bits.append(slab('toggle_cover', ellipse(tx_, ty_, 0.75, 0.75, n=48), -BODY_T - 0.06, -BODY_T, M['plastic'], r_bot=0.015, steps=2))

# --------------------------------------------------------------- groups ----
G['Body'] = body
G['Pickguard'] = merge('Pickguard', guard_bits)
G['Screws'] = merge('Screws', screws)
G['NeckPickup'] = merge('NeckPickup', pu['NeckPickup'])
G['BridgePickup'] = merge('BridgePickup', pu['BridgePickup'])
G['Bridge'] = merge('Bridge', tom)
G['Saddles'] = merge('Saddles', tom_saddles)
G['Tailpiece'] = merge('Tailpiece', stop)
G['Controls'] = merge('Controls', ctrl)
G['BackHardware'] = merge('BackHardware', back_bits)

tail_x = min(p[0] for p in body_pts)
rootob = P.assemble('Scree', G, tail_x, -BODY_T / 2)
print(f'[scree] objects {len(G)}, polygons {sum(len(o.data.polygons) for o in G.values())}')
bd = Vector(body.dimensions) / IN
print(f'[scree] body {bd.x:.3f} x {bd.y:.3f} x {bd.z:.3f} in')
print('[scree] crest heights above the top', [round(c[1], 3) for c in crests])


def dev_near(pt, r=1.3):
    sel = [d for p, d in zip(body_pts, dev) if math.dist(p, pt) < r]
    return round(float(max(sel)) * 25.4, 1) if sel else 0.0


departures = dict(bass_horn_mm=dev_near(bass_tip), treble_horn_mm=dev_near(treb_tip), bass_waist_mm=dev_near(bass_waist, 1.0),
                  treble_waist_mm=dev_near(treb_waist, 1.0))
print('[scree] departures from the plan outline', departures)

page = dict(
    units='inch', brand=P.BRAND, model='Scree', scale=NK.scale, radius=NK.radius, frets=NK.n_frets, nut_width=round(2 * NK.nut_half, 3),
    body=dict(length=round(bd.x, 3), width=round(bd.y, 3), depth=round(BODY_T, 3)),
    headstock_length=round(NK.head_len, 3), overall=round(NK.NUT_X1 + NK.head_len * math.cos(NK.hp) - tail_x, 3),
    body_outline=P.r3(body_pts[::2]), plan_outline=P.r3(plan_body[::4]), pickguard=P.r3(guard_line[::2]), pickguard_slot=[],
    bevels={k: P.r3(v[::2]) for k, v in D['bevels'].items()},
    neck=P.r3(NK.page_neck()), fret_x=[round(x, 3) for x in NK.fret_x],
    fret_span=[[round(NK.width(x)[0], 3), round(NK.width(x)[1], 3)] for x in NK.fret_x],
    nut=[NK.NUT_X0, NK.NUT_X1, NK.nut_half], posts=P.r3([(NK.NUT_X1 + a * math.cos(NK.hp), b) for a, b in P.THREE_POSTS]), dots=P.r3(NK.marks),
    pickups=[dict(kind='humbucker', x=p[0], y=0, angle=0) for p in D['pickups']],
    bridge=P.r3(posts), tailpiece=P.r3(studs), knobs=P.r3(D['knobs']), switch=list(D['toggle']),
    strings=[[[round(crests[i][0], 3), round(Y_BRIDGE[i], 3)], [NK.NUT_X0, round(NK.y_nut[i], 3)]] for i in range(6)],
    gauges=P.GAUGE, departures=departures,
)
json.dump(page, open(os.path.join(ROOT, 'site', 'assets', 'data', f'{ID}.json'), 'w'))

if '--no-export' not in ARGS:
    P.export(rootob, G, OUT_GLB, os.path.join(HERE, f'{ID}.blend'))
else:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, f'{ID}.blend'))
