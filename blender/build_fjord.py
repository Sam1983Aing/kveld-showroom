"""KVELD Fjord: a semi-hollow thinline built from the ES-335 plans.

  blender -b -P blender/build_fjord.py -- [--no-export]

Dimensions from reference/es335/parsed/335.json (tools/extract_335.py): the
1:1 body, the arched top from the sheet's own contour map (0.05 to 0.45 in
above a 1 3/4 in rim), the slanted bridge, stopbar, pickups and knobs, a
24.54 in scale from the drawn frets, neck pitched 4 degrees, head 17.

KVELD's own: the 3+3 headstock, markers, tuners, knobs, and on this body:
  - KVELD sound holes: one S-shaped slot from a fine point to a single round
    eye, in place of the f with an eye at each end
  - both horns shortened and rounded fuller
  - no guard (the floating comma we drew sat over the toggle; taken off)
  - the jack in the rim
Judged: the back's arch (85% of the top's) and the board height at the joint.
"""
import json, math, os, sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kveld_kit as K                    # noqa: E402
import kveld_parts as P                  # noqa: E402
from kveld_kit import IN, principled, srgb, slab, lathe, place, tube, rounded_rect, catmull, merge, ccw  # noqa: E402

ROOT = K.ROOT
D = json.load(open(os.path.join(ROOT, 'reference', 'es335', 'parsed', '335.json')))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ID = 'fjord'
OUT_GLB = os.path.join(ROOT, 'site', 'assets', 'models', f'{ID}.glb')
OUT_TEX = os.path.join(HERE, 'textures')
RIM = D['rim']
UV0, UVS = (-10.5, -10.5), 21.0

scene = K.begin('Fjord')
M = P.house_materials()
os.makedirs(OUT_TEX, exist_ok=True)

# ---------------------------------------------------------------- body ----
plan_body = [tuple(p) for p in D['body_outline']]
body_pts = plan_body[::2]
bass_tip = max((p for p in body_pts if p[1] > 2), key=lambda p: p[0])
treb_tip = max((p for p in body_pts if p[1] < -2), key=lambda p: p[0])
body_pts = P.reshape_horn(body_pts, bass_tip, 0.30, radius=1.8, round_r=1.5, rounds=30)
body_pts = P.reshape_horn(body_pts, treb_tip, 0.30, radius=1.8, round_r=1.5, rounds=30)
dev = P.departure(body_pts, plan_body)

loops = []
for a in D['arch']:
    lp = [tuple(p) for p in a['loop']]
    xs = [p[0] for p in lp]
    # round off the corners where the drawn half meets its mirror
    for cx in (min(xs), max(xs)):
        lp = P.relax(lp, (cx, 0.0), 0.5, rounds=6)
    loops.append(lp)
arch = P.ArchMap(body_pts, loops, [a['h'] for a in D['arch']])
BACK_K = 0.85


# the top as drawn, resampled fine and softened a touch, so the arch rolls into
# the rim without the small kinks of the contour map (Sam saw rough edges at the waist)
arch_s = P.SmoothField(arch, body_pts, step=0.035, blur=4)


def top_fn(x, y):
    return arch_s(x, y)


def back_fn(x, y):
    return -RIM - BACK_K * arch(x, y)


# sound holes: KVELD's slot, laid where the drawn f-holes are
holes = []
for fh in D['fholes_original']:
    tail = min(fh, key=lambda p: p[0]); neck = max(fh, key=lambda p: p[0])
    p0 = Vector(tail) + Vector((0.15, 0)); p1 = Vector(neck) - Vector((0.18, 0))
    d = p1 - p0; nn = Vector((-d.y, d.x)).normalized() * (1 if tail[1] > 0 else -1)
    c1 = p0 + d * 0.38 - nn * 0.55; c2 = p0 + d * 0.62 + nn * 0.55
    holes.append(P.kveld_fhole(p0, c1, c2, p1, eye=0.24, w_mid=0.19))

burst_png = P.figured_top_png(os.path.join(OUT_TEX, 'fjord_top.png'), body_pts, UV0, UVS,
                              centre_col=(0.36, 0.56, 0.45), edge_col=(0.015, 0.13, 0.12), burst=2.6, flame=0.18, figure=0.6, calm=True)
M_TOP = principled('Body_Maple_SeaGreenBurst', (1, 1, 1), 0.3, coat=1.0, coat_rough=0.018, tex=burst_png)
M_RIM = principled('Rim_SeaGreen', srgb((0.02, 0.15, 0.14)), 0.3, coat=1.0, coat_rough=0.02)
M_EDGE = principled('Maple_Edge', srgb((0.78, 0.66, 0.48)), 0.5)
body = P.body_shell('Body', body_pts, top_fn, back_fn, M_TOP, r_top=0.05, r_bot=0.05, steps=4, grid=0.08, grid_top=0.06,
                    top_rings=1.6, back_rings=1.6,
                    uv_origin=UV0, uv_size=UVS, rim_mat=M_RIM, bind=(M['binding'], 0.09), top_holes=holes)
fh_bits = [P.hole_walls(f'fhole_{k}', h, top_fn, 0.12, M_EDGE, M['hole'], -RIM + 0.35) for k, h in enumerate(holes)]

# ----------------------------------------------------------------- neck ----
SCALE = D['scale']
JOINT = D['neck_joint_x']
BOARD_END = SCALE * 2 ** (-22 / 12) - 0.28
clear = max(arch(x, y) for x in np.linspace(BOARD_END, JOINT, 12) for y in np.linspace(-1.15, 1.15, 9))
Z_BOARD = round(clear + 0.25 + 0.04, 3)
rose_png = os.path.join(OUT_TEX, 'heath_rosewood.png')
neck_png = P.mahogany_png(os.path.join(OUT_TEX, 'fjord_neck.png'), 2.8, 30.0, w=2048, h=512, vs=5.0, seed=51, tint=(0.62, 0.48, 0.42))
M_NECK = principled('Neck_Mahogany', (1, 1, 1), 0.32, coat=1.0, coat_rough=0.03, tex=neck_png)
M_BOARD = principled('Board_Rosewood', (1, 1, 1), 0.48, tex=rose_png)
M_VENEER = principled('Veneer_Black', srgb((0.012, 0.012, 0.014)), 0.3, coat=1.0, coat_rough=0.02)
NK = P.SetNeck(M, M_BOARD, M_NECK, scale=SCALE, radius=12.0, frets=22, nut_half=0.8475, heel_half=1.10, board_t=0.25,
               z_board=Z_BOARD, x_joint=JOINT, board_end=BOARD_END, x_heel=5.6, pitch=D['neck_pitch_deg'],
               head_pitch=D['head_pitch_deg'], bind=0.06, bind_mat=M['binding'], veneer_mat=M_VENEER,
               heel_drop=max(0.0, Z_BOARD - 0.94 + RIM - 0.15), heel_len=2.0)
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
z_posts = sum(arch(*p) for p in posts) / 2
tom, tom_saddles = P.tune_o_matic(posts, crests, Y_BRIDGE, M, z_body=z_posts - 0.01)
studs = [tuple(p) for p in D['stop_studs']]
z_studs = sum(arch(*p) for p in studs) / 2
stop, (sx, sz) = P.stopbar(studs, M, z_body=z_studs - 0.01, height=0.16)
Y_ANCHOR = [1.0 - i * 0.40 for i in range(6)]
G['Strings'] = merge('Strings', NK.strings([[(sx - 0.03, Y_ANCHOR[i], sz)] for i in range(6)], crests, Y_BRIDGE))

# -------------------------------------------------------------- pickups ----
pu = {}
for tag, (cx, cy) in zip(('BridgePickup', 'NeckPickup'), D['pickups']):
    ys = [Y_BRIDGE[i] + (NK.y_nut[i] - Y_BRIDGE[i]) * cx / NK.scale for i in range(6)]
    z0 = min(arch(cx + dx, dy) for dx in (-0.78, 0, 0.78) for dy in (-1.72, 0, 1.72)) - 0.005
    nut_pt = NK.to_body((NK.NUT_X0, 0.0, NK.board_z(0.0) + 0.058))
    ring, hb = P.seat_humbucker(tag.lower(), cx, ys, z0, P.string_z(crests, (nut_pt[0], nut_pt[2]), cx), M,
                                gap=0.13 if tag == 'BridgePickup' else 0.16)
    pu[tag] = ring + hb

# ---------------------------------------------------------------- guard ----
# None. Our floating comma guard ran over the toggle switch, whose lever came
# up through it; the guitar reads cleaner without it (Sam, round 8).
guard_line, screws = [], []

# ------------------------------------------------------------- controls ----
ctrl = []
for k, (x, y) in enumerate(D['knobs']):
    n = arch.normal(x, y)
    ctrl.append(P.knob(k, x, y, arch(x, y) - 0.055, M, axis=n, spin=0.4 * k))
edge_y = min(p[1] for p in body_pts if abs(p[0] - 4.2) < 0.3)
tg = (4.2, edge_y + 1.05)
ctrl += P.toggle_switch(tg[0], tg[1], arch(*tg), M, axis=arch.normal(*tg), lean=(0.0, 0.3))

# ------------------------------------------------- jack, straps, back ----
back_bits = []
jp, jn, _ = P.outline_point(body_pts, (-8.6, -6.4))
back_bits += P.edge_jack(jp, jn, -RIM / 2, M)
tail_p, tail_n, _ = P.outline_point(body_pts, (-11.0, 0.0))
hp, hn, _ = P.outline_point(body_pts, max(ccw(list(body_pts)), key=lambda p: p[0] if p[1] > 2 else -99))
back_bits.append(P.strap_button('strap_tail', tail_p, tail_n, -RIM / 2, M))
back_bits.append(P.strap_button('strap_horn', hp, hn, -RIM / 2, M))

# --------------------------------------------------------------- groups ----
G['Body'] = body
G['SoundHoles'] = merge('SoundHoles', fh_bits)
G['NeckPickup'] = merge('NeckPickup', pu['NeckPickup'])
G['BridgePickup'] = merge('BridgePickup', pu['BridgePickup'])
G['Bridge'] = merge('Bridge', tom)
G['Saddles'] = merge('Saddles', tom_saddles)
G['Tailpiece'] = merge('Tailpiece', stop)
G['Controls'] = merge('Controls', ctrl)
G['BackHardware'] = merge('BackHardware', back_bits)

tail_x = min(p[0] for p in body_pts)
rootob = P.assemble('Fjord', G, tail_x, -RIM / 2)
print(f'[fjord] objects {len(G)}, polygons {sum(len(o.data.polygons) for o in G.values())}')
bd = Vector(body.dimensions) / IN
print(f'[fjord] body {bd.x:.3f} x {bd.y:.3f} x {bd.z:.3f} in, board crown at the joint {Z_BOARD}')
print('[fjord] crest heights', [round(c[1], 3) for c in crests], 'arch at the bridge', round(arch(0, 0), 3))


def dev_near(pt, r=1.3):
    sel = [d for p, d in zip(body_pts, dev) if math.dist(p, pt) < r]
    return round(float(max(sel)) * 25.4, 1) if sel else 0.0


departures = dict(bass_horn_mm=dev_near(bass_tip), treble_horn_mm=dev_near(treb_tip))
print('[fjord] departures from the plan outline', departures)

page = dict(
    units='inch', brand=P.BRAND, model='Fjord', scale=round(SCALE, 3), radius=NK.radius, frets=NK.n_frets, nut_width=round(2 * NK.nut_half, 3),
    body=dict(length=round(bd.x, 3), width=round(bd.y, 3), depth=round(bd.z, 3)),
    headstock_length=round(NK.head_len, 3), overall=round(NK.NUT_X1 + NK.head_len * math.cos(NK.hp) - tail_x, 3),
    body_outline=P.r3(body_pts[::2]), plan_outline=P.r3(plan_body[::4]), pickguard=P.r3(guard_line[::2]), pickguard_slot=[],
    soundholes=[P.r3(h[::2]) for h in holes], arch=[dict(h=a['h'], loop=P.r3(a['loop'][::4])) for a in D['arch']],
    neck=P.r3(NK.page_neck()), fret_x=[round(x, 3) for x in NK.fret_x],
    fret_span=[[round(NK.width(x)[0], 3), round(NK.width(x)[1], 3)] for x in NK.fret_x],
    nut=[NK.NUT_X0, NK.NUT_X1, NK.nut_half], posts=P.r3([(NK.NUT_X1 + a * math.cos(NK.hp), b) for a, b in P.THREE_POSTS]), dots=P.r3(NK.marks),
    pickups=[dict(kind='humbucker', x=p[0], y=0, angle=0) for p in D['pickups']],
    bridge=P.r3(posts), tailpiece=P.r3(studs), knobs=P.r3(D['knobs']), switch=list(tg),
    strings=[[[round(crests[i][0], 3), round(Y_BRIDGE[i], 3)], [NK.NUT_X0, round(NK.y_nut[i], 3)]] for i in range(6)],
    gauges=P.GAUGE, departures=departures,
)
json.dump(page, open(os.path.join(ROOT, 'site', 'assets', 'data', f'{ID}.json'), 'w'))

if '--no-export' not in ARGS:
    P.export(rootob, G, OUT_GLB, os.path.join(HERE, f'{ID}.blend'))
else:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, f'{ID}.blend'))
