"""KVELD Rowan: a carved-top single-cut built from the Les Paul plans.

  blender -b -P blender/build_rowan.py -- [--no-export]

Dimensions from reference/lespaul/parsed/lp.json (tools/extract_lp.py): the 1:1
body and its twelve isolines, the cap from the sections (3/16 in at the rim,
0.543 in at the crown, over 1.845 in of mahogany), the pickups, slanted bridge
and stopbar from the 1:1 front plan, a 24.75 in scale, neck pitched 4 degrees.

KVELD's own: the 3+3 headstock, markers, tuners, knobs, and on this body:
  - the cutaway horn reshaped: shorter, rounder
  - the carve profile: the drawn isolines kept as the plan of the carve, the
    heights between them ours, fuller over the crown and a softer fall to the rim
  - the controls redrawn: four knobs on an arc along the lower bout, the toggle
    where the plan has it, the jack in the rim
  - no guard (the floating comma we drew was taken off in review)
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
D = json.load(open(os.path.join(ROOT, 'reference', 'lespaul', 'parsed', 'lp.json')))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ID = 'rowan'
OUT_GLB = os.path.join(ROOT, 'site', 'assets', 'models', f'{ID}.glb')
OUT_TEX = os.path.join(HERE, 'textures')
BACK = D['back']
CAP_RIM = D['cap_rim']
UV0, UVS = (-9.0, -9.0), 18.5

scene = K.begin('Rowan')
M = P.house_materials()
os.makedirs(OUT_TEX, exist_ok=True)

# ---------------------------------------------------------------- body ----
plan_body = [tuple(p) for p in D['body_outline']]
body_pts = plan_body[::2]
treb_tip = max((p for p in body_pts if p[1] < -2), key=lambda p: p[0])
body_pts = P.reshape_horn(body_pts, treb_tip, 0.32, radius=1.5, round_r=1.2, rounds=26)
dev = P.departure(body_pts, plan_body)

loops = [[tuple(p) for p in i['loop']] for i in D['isolines']]
levels = [i['h'] for i in D['isolines']]
rise = levels[-1]
# ours: same contour lines, fuller over the crown, a softer start at the rim
ours = [rise * (h / rise) ** 0.8 for h in levels]
arch = P.ArchMap(body_pts, loops, ours, top=0.015)


# the carve resampled fine and softened a touch: the isolines' small kinks
# showed as a wavy rim and binding (Sam, round 9)
arch_s = P.SmoothField(arch, body_pts, step=0.035, blur=4)


def top_fn(x, y):
    return arch_s(x, y)


def back_fn(x, y):
    return -BACK - CAP_RIM


top_png = P.figured_top_png(os.path.join(OUT_TEX, 'rowan_top.png'), body_pts, UV0, UVS,
                            centre_col=(0.74, 0.45, 0.12), edge_col=(0.36, 0.025, 0.02), burst=2.3, flame=1.0, figure=0.5, seed=23)
back_png = P.mahogany_png(os.path.join(OUT_TEX, 'rowan_back.png'), UV0[0], UVS, w=2048, h=2048, vs=UVS, seed=61, tint=(0.95, 0.42, 0.35))
M_TOP = principled('Body_FlameMaple_CherryBurst', (1, 1, 1), 0.28, coat=1.0, coat_rough=0.015, tex=top_png)
M_BACK = principled('Body_Mahogany_Cherry', (1, 1, 1), 0.3, coat=1.0, coat_rough=0.02, tex=back_png)
body = P.body_shell('Body', body_pts, top_fn, back_fn, M_TOP, r_top=0.05, r_bot=0.12, steps=5, grid=0.08, grid_top=0.06,
                    top_rings=1.6, uv_origin=UV0,
                    uv_size=UVS, rim_mat=M_BACK, back_mat=M_BACK, bind=(M['binding'], 0.10), bind_back=False)

# ----------------------------------------------------------------- neck ----
SCALE = D['scale']
JOINT = max(p[0] for p in body_pts if abs(p[1]) < 0.8)
BOARD_END = SCALE * 2 ** (-22 / 12) - 0.28
clear = max(arch(x, y) for x in np.linspace(BOARD_END, JOINT, 12) for y in np.linspace(-1.15, 1.15, 9))
Z_BOARD = round(clear + 0.25 + 0.04, 3)
rose_png = os.path.join(OUT_TEX, 'heath_rosewood.png')
neck_png = P.mahogany_png(os.path.join(OUT_TEX, 'rowan_neck.png'), 2.8, 30.0, w=2048, h=512, vs=5.0, seed=63, tint=(0.95, 0.42, 0.35))
M_NECK = principled('Neck_Mahogany_Cherry', (1, 1, 1), 0.32, coat=1.0, coat_rough=0.03, tex=neck_png)
M_BOARD = principled('Board_Rosewood', (1, 1, 1), 0.48, tex=rose_png)
M_VENEER = principled('Veneer_Black', srgb((0.012, 0.012, 0.014)), 0.3, coat=1.0, coat_rough=0.02)
# Beside the treble cutaway the body's wall runs along the neck (|y| 1.07 to
# 1.11): the neck's treble side is kept 0.004 in inside it, eased, so the two
# never cross. (Crossing at a slant, the neck cut the binding on a diagonal.)
_wall = sorted((p[0], -p[1]) for p in body_pts if p[1] < -0.9 and p[1] > -1.3 and p[0] > 7.0)
_wx = np.array([a for a, b in _wall]); _wy = np.array([b for a, b in _wall])


def treble_wall(x):
    if x < _wx.min() - 0.3 or x > JOINT + 0.05:
        return None
    k = np.abs(_wx - x) < 0.25
    w = float(_wy[k].min()) if k.any() else float(np.interp(x, _wx, _wy))
    return w - 0.004 + 0.5 * max(0.0, _wx.min() - x)       # eases back out past the cutaway's end


NK = P.SetNeck(M, M_BOARD, M_NECK, scale=SCALE, radius=12.0, frets=22, nut_half=0.8475, heel_half=1.10, board_t=0.25,
               z_board=Z_BOARD, x_joint=JOINT, board_end=BOARD_END, x_heel=6.6, pitch=D['neck_pitch_deg'],
               head_pitch=D['head_pitch_deg'], bind=0.06, bind_mat=M['binding'], veneer_mat=M_VENEER,
               heel_drop=max(0.0, Z_BOARD - 0.94 + BACK + CAP_RIM - 0.2), heel_len=2.4, side_limit=treble_wall)
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
tom, tom_saddles = P.tune_o_matic(posts, crests, Y_BRIDGE, M, z_body=sum(arch(*p) for p in posts) / 2 - 0.01)
studs = [tuple(p) for p in D['stop_studs']]
stop, (sx, sz) = P.stopbar(studs, M, z_body=sum(arch(*p) for p in studs) / 2 - 0.01, height=0.2)
Y_ANCHOR = [1.0 - i * 0.40 for i in range(6)]
G['Strings'] = merge('Strings', NK.strings([[(sx - 0.03, Y_ANCHOR[i], sz)] for i in range(6)], crests, Y_BRIDGE))

# -------------------------------------------------------------- pickups ----
M_ZEBRA = principled('Bobbin_Cream', srgb((0.86, 0.80, 0.64)), 0.32)
pu = {}
for tag, (cx, cy) in zip(('BridgePickup', 'NeckPickup'), D['pickups']):
    ys = [Y_BRIDGE[i] + (NK.y_nut[i] - Y_BRIDGE[i]) * cx / NK.scale for i in range(6)]
    z0 = min(arch(cx + dx, dy) for dx in (-0.78, 0, 0.78) for dy in (-1.72, 0, 1.72)) - 0.005
    nut_pt = NK.to_body((NK.NUT_X0, 0.0, NK.board_z(0.0) + 0.058))
    ring, hb = P.seat_humbucker(tag.lower(), cx, ys, z0, P.string_z(crests, (nut_pt[0], nut_pt[2]), cx), M,
                                gap=0.13 if tag == 'BridgePickup' else 0.16, cover=False, ring_mat=M['parchment'], bobbin_mat=M_ZEBRA)
    # zebra: the slug bobbin black, the screw bobbin cream
    for o in hb:
        if '_bob_-0.33' in o.name:
            o.data.materials.clear(); o.data.materials.append(M['plastic'])
    pu[tag] = ring + hb

# ---------------------------------------------------------------- guard ----
# None: the floating comma we drew read as a borrowed part (Sam, round 9).
guard_line, screws = [], []

# ------------------------------------------------------------- controls ----
# ours: four knobs on an arc along the lower bout (the plan has a trapezoid)
C = [(-1.30, -4.95), (-2.80, -5.10), (-4.25, -4.85), (-5.55, -4.20)]
ctrl = [P.knob(k, x, y, arch(x, y) - 0.055, M, axis=arch.normal(x, y), spin=0.4 * k) for k, (x, y) in enumerate(C)]
tg = (D['toggle'][0], D['toggle'][1] - 0.15)
ctrl += P.toggle_switch(tg[0], tg[1], arch(*tg), M, axis=arch.normal(*tg), lean=(0.0, 0.3))

# ------------------------------------------------- jack, straps, back ----
z_mid = -(BACK + CAP_RIM) / 2
back_bits = []
jp, jn, _ = P.outline_point(body_pts, (-6.2, -5.6))
back_bits += P.edge_jack(jp, jn, z_mid, M)
tail_p, tail_n, _ = P.outline_point(body_pts, (-9.0, 0.0))
hp, hn, _ = P.outline_point(body_pts, (6.0, 6.0))
back_bits.append(P.strap_button('strap_tail', tail_p, tail_n, z_mid, M))
back_bits.append(P.strap_button('strap_upper', hp, hn, z_mid, M))
# cavity covers on the back: controls and toggle
zb = -BACK - CAP_RIM
# Control cover: a plate following the knobs' own arc, 0.55 in either side of
# it with round ends, gloss black with a rounded edge and four screws (the
# first, drawn freehand round the knobs, read as a lumpy flat blot).
M_COVER = principled('Cover_Black', srgb((0.02, 0.02, 0.022)), 0.25, coat=1.0, coat_rough=0.03)
c_line = catmull(C, per=12, closed=False)
cov = P.band(c_line, 0.62)
back_bits.append(slab('cavity_cover', cov, zb - 0.07, zb, M_COVER, r_bot=0.03, steps=4))
for k, f in enumerate((0.0, 1.0)):
    i = int(f * (len(c_line) - 1)); a_, b_ = Vector(c_line[i]), Vector(c_line[i + (1 if f == 0 else -1)])
    p_ = a_ + (a_ - b_).normalized() * 0.4
    back_bits.append(P.screw(f'cover_screw_{k}', (p_.x, p_.y, zb - 0.07), M, axis=(0, 0, -1), d=0.15, h=0.035))
mid = Vector(c_line[len(c_line) // 2]); tmid = (Vector(c_line[len(c_line) // 2 + 1]) - Vector(c_line[len(c_line) // 2 - 1])).normalized()
for k, sgn in enumerate((1, -1)):
    p_ = mid + Vector((-tmid.y, tmid.x)) * 0.45 * sgn
    back_bits.append(P.screw(f'cover_screw_{k + 2}', (p_.x, p_.y, zb - 0.07), M, axis=(0, 0, -1), d=0.15, h=0.035))
back_bits.append(slab('toggle_cover', K.ellipse(tg[0], tg[1], 0.8, 0.8, n=64), zb - 0.07, zb, M_COVER, r_bot=0.03, steps=4))
for k, a in enumerate((0.6, 0.6 + math.pi)):
    back_bits.append(P.screw(f'tcover_screw_{k}', (tg[0] + 0.62 * math.cos(a), tg[1] + 0.62 * math.sin(a), zb - 0.07), M, axis=(0, 0, -1), d=0.13, h=0.03))

if os.environ.get('DBG_COVER'):
    for nm, poly in (('cover', cov), ('toggle cover', K.ellipse(tg[0], tg[1], 0.8, 0.8, n=64))):
        ax = np.array([p[0] for p in poly]); ay = np.array([p[1] for p in poly])
        print('[cover] %s: outside %d, nearest rim %.3f' % (nm, int((~P.inside(ax, ay, body_pts)).sum()), float(P._dist_to_poly(ax, ay, body_pts).min())))
    print('[cover] toggle at', tg)

# --------------------------------------------------------------- groups ----
G['Body'] = body
G['NeckPickup'] = merge('NeckPickup', pu['NeckPickup'])
G['BridgePickup'] = merge('BridgePickup', pu['BridgePickup'])
G['Bridge'] = merge('Bridge', tom)
G['Saddles'] = merge('Saddles', tom_saddles)
G['Tailpiece'] = merge('Tailpiece', stop)
G['Controls'] = merge('Controls', ctrl)
G['BackHardware'] = merge('BackHardware', back_bits)

tail_x = min(p[0] for p in body_pts)
rootob = P.assemble('Rowan', G, tail_x, z_mid)
print(f'[rowan] objects {len(G)}, polygons {sum(len(o.data.polygons) for o in G.values())}')
bd = Vector(body.dimensions) / IN
print(f'[rowan] body {bd.x:.3f} x {bd.y:.3f} x {bd.z:.3f} in, board crown at the joint {Z_BOARD}, crown {arch(-0.5, 0):.3f}')
print('[rowan] crest heights', [round(c[1], 3) for c in crests])
d_tip = round(float(max(d for p, d in zip(body_pts, dev) if math.dist(p, treb_tip) < 1.3)) * 25.4, 1)
departures = dict(cutaway_horn_mm=d_tip, carve='levels^0.8 over the drawn isolines')
print('[rowan] departures', departures)

page = dict(
    units='inch', brand=P.BRAND, model='Rowan', scale=SCALE, radius=NK.radius, frets=NK.n_frets, nut_width=round(2 * NK.nut_half, 3),
    body=dict(length=round(bd.x, 3), width=round(bd.y, 3), depth=round(bd.z, 3)),
    headstock_length=round(NK.head_len, 3), overall=round(NK.NUT_X1 + NK.head_len * math.cos(NK.hp) - tail_x, 3),
    body_outline=P.r3(body_pts[::2]), plan_outline=P.r3(plan_body[::4]), pickguard=P.r3(guard_line[::2]), pickguard_slot=[],
    isolines=[dict(h=round(h, 4), loop=P.r3(l[::3])) for h, l in zip(ours, loops)],
    neck=P.r3(NK.page_neck()), fret_x=[round(x, 3) for x in NK.fret_x],
    fret_span=[[round(NK.width(x)[0], 3), round(NK.width(x)[1], 3)] for x in NK.fret_x],
    nut=[NK.NUT_X0, NK.NUT_X1, NK.nut_half], posts=P.r3([(NK.NUT_X1 + a * math.cos(NK.hp), b) for a, b in P.THREE_POSTS]), dots=P.r3(NK.marks),
    pickups=[dict(kind='humbucker', x=p[0], y=0, angle=0) for p in D['pickups']],
    bridge=P.r3(posts), tailpiece=P.r3(studs), knobs=P.r3(C), switch=list(tg),
    strings=[[[round(crests[i][0], 3), round(Y_BRIDGE[i], 3)], [NK.NUT_X0, round(NK.y_nut[i], 3)]] for i in range(6)],
    gauges=P.GAUGE, departures=departures,
)
json.dump(page, open(os.path.join(ROOT, 'site', 'assets', 'data', f'{ID}.json'), 'w'))

if '--no-export' not in ARGS:
    P.export(rootob, G, OUT_GLB, os.path.join(HERE, f'{ID}.blend'))
else:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, f'{ID}.blend'))
