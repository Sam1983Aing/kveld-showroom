"""KVELD Sedge: a carved-top double-cut built from the Music Man Axis plan.

  blender -b -P blender/build_sedge.py -- [--no-export]

Dimensions from reference/axis/parsed/axis.json (tools/extract_axis.py): the 1:1
body, the drawn carve line on the bass side, the pickups and the knob, a
25.5 in scale (648 mm between the drawn saddle line and nut), 22 frets, 10 in
radius, 1.625 in nut. The neck is the house bolt-on neck in maple, narrowed to
the Axis nut.

KVELD's own: the six-in-line head, markers, tuners, knobs, and on this body:
  - horn tips pulled back and rounded, both waists reshaped
  - the carve made gentler (0.3 in at the rim, judged: the sheet only draws
    where it starts), with the maple cap showing as a natural edge
  - a fixed bridge, strings through the body, in place of the locking vibrato
  - tone and three-way added beside the volume, the jack in the rim
"""
import json, math, os, sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kveld_kit as K                    # noqa: E402
import kveld_parts as P                  # noqa: E402
from kveld_kit import IN, principled, srgb, slab, lathe, place, rounded_rect, catmull, merge, ccw  # noqa: E402

ROOT = K.ROOT
D = json.load(open(os.path.join(ROOT, 'reference', 'axis', 'parsed', 'axis.json')))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ID = 'sedge'
OUT_GLB = os.path.join(ROOT, 'site', 'assets', 'models', f'{ID}.glb')
OUT_TEX = os.path.join(HERE, 'textures')
BODY_T = 1.75
UV0, UVS = (-8.5, -8.5), 17.0

scene = K.begin('Sedge')
M = P.house_materials()
os.makedirs(OUT_TEX, exist_ok=True)

# ---------------------------------------------------------------- body ----
raw = [tuple(p) for p in D['body_outline']]
# The sheet's outline runs into the neck pocket (floor at 7.61, the treble wall
# to the cutaway at 8.28, the bass wall on to 10.41). Under the neck the body
# goes on to the dashed heel line, so that is the outline there.
i_corner = min(range(len(raw)), key=lambda k: math.dist(raw[k], (8.284, -1.047)))
i_wall = min(range(len(raw)), key=lambda k: math.dist(raw[k], (10.414, 1.091)))
heel = [tuple(p) for p in D['heel_curve']][::-1]                     # treble end first
heel = [p for p in heel if math.dist(p, raw[i_wall]) > 0.12]
plan_body = raw[i_wall:i_corner + 1] + heel if i_wall < i_corner else raw[i_wall:] + raw[:i_corner + 1] + heel
body_pts = plan_body[::2]
bass_tip = max((p for p in body_pts if p[1] > 2), key=lambda p: p[0])
treb_tip = max((p for p in body_pts if p[1] < -2), key=lambda p: p[0])
bass_waist = min((p for p in body_pts if p[1] > 2 and 5 < p[0] < 8), key=lambda p: p[1])
treb_waist = max((p for p in body_pts if p[1] < -2 and 3 < p[0] < 6.5), key=lambda p: p[1])
body_pts = P.reshape_horn(body_pts, bass_tip, 0.38, radius=1.8, round_r=1.3, rounds=24)
body_pts = P.reshape_horn(body_pts, treb_tip, 0.26, radius=1.5, round_r=1.1, rounds=20)
body_pts = P.push(body_pts, bass_waist, 1.8, (0.12, 0.20))
body_pts = P.push(body_pts, treb_waist, 1.8, (0.12, -0.20))
dev = P.departure(body_pts, plan_body)
edge = P.Edge(body_pts)

CARVE = 0.30
carve = P.contour_fn(edge, D['carve_line'], CARVE, power=2.0, side=1, taper=0.25)
roll = lambda x, y: 0.10 * (1 - min(edge.dist(x, y) / 0.9, 1.0)) ** 2      # a soft roll all round


# one smooth surface: the carve and the edge roll blended without a crease,
# then resampled fine and softened (the polyline carve line left small kinks)
def _top_grid(X, Y):
    c = P.contour_grid(body_pts, D['carve_line'], CARVE, X, Y, power=2.0, side=1, taper=0.25)
    r = 0.10 * (1 - np.minimum(P._dist_to_poly(X, Y, ccw(list(body_pts))) / 0.9, 1.0)) ** 2
    k = 0.03
    return -(0.5 * (c + r + np.sqrt((c - r) ** 2 + k * k)) - 0.5 * k)


top_fn = P.SmoothGrid(_top_grid, body_pts, step=0.035, blur=4)


def back_fn(x, y):
    return -BODY_T


top_png = P.figured_top_png(os.path.join(OUT_TEX, 'sedge_top.png'), body_pts, UV0, UVS,
                            centre_col=(0.60, 0.27, 0.035), edge_col=(0.22, 0.06, 0.01), burst=1.4, flame=1.0, figure=0.5, seed=17)
M_TOP = principled('Body_FlameMaple_Amber', (1, 1, 1), 0.28, coat=1.0, coat_rough=0.015, tex=top_png)
M_BACK = principled('Body_Basswood_Amber', srgb((0.40, 0.17, 0.045)), 0.3, coat=1.0, coat_rough=0.02)
M_CAP = principled('Maple_Edge', srgb((0.86, 0.72, 0.50)), 0.32, coat=1.0, coat_rough=0.02)
body = P.body_shell('Body', body_pts, top_fn, back_fn, M_TOP, r_top=0.14, r_bot=0.25, steps=8, grid=0.12, grid_top=0.07, uv_origin=UV0,
                    uv_size=UVS, rim_mat=M_BACK, back_mat=M_BACK, bind=(M_CAP, 0.14), bind_back=False)

# ----------------------------------------------------------------- neck ----
M_MAPLE = principled('Neck_Maple', (1, 1, 1), 0.32, coat=1.0, coat_rough=0.032, tex=os.path.join(OUT_TEX, 'floe_maple.png'))
M_FB = principled('Board_Maple', (1, 1, 1), 0.30, coat=1.0, coat_rough=0.04, tex=os.path.join(OUT_TEX, 'floe_maple.png'))
NK = P.BoltOnNeck(M, M_FB, M_MAPLE, scale=25.5, radius=D['radius'], frets=22, nut_half=0.8125, heel_x=7.614, board_x0=7.07,
                  dot_mat=M['dot_black'], width_k=1.625 / 1.652)
Y_BRIDGE = [1.05 - i * 0.42 for i in range(6)]
COMP = [-0.10, -0.07, -0.04, -0.06, -0.04, 0.0]
crests = [(COMP[i], NK.board_z(Y_BRIDGE[i]) + 0.148) for i in range(6)]
ht, ht_saddles, ht_holes, HT_T = P.hardtail(crests, Y_BRIDGE, M)
starts = [[(hx, y, HT_T - 0.01), (hx + 0.06, y, HT_T + 0.12)] for hx, y in ht_holes]
G = NK.build(Y_BRIDGE, crests, starts)

# -------------------------------------------------------------- pickups ----
pu = {}
for tag, (cx, cy) in zip(('BridgePickup', 'NeckPickup'), D['pickups']):
    ys = [Y_BRIDGE[i] + (NK.y_nut[i] - Y_BRIDGE[i]) * cx / NK.scale for i in range(6)]
    pu[tag] = P.open_humbucker(tag.lower(), cx, 0.0, ys, top_fn(cx, 0.0), M)

# ------------------------------------------------------------- controls ----
kx, ky = D['knob']
C = [(kx, ky), (-0.35, -3.62)]
ctrl = [P.knob(k, x, y, top_fn(x, y) - 0.055, M, spin=0.5 * k) for k, (x, y) in enumerate(C)]
tg = (3.15, -3.95)
ctrl += P.toggle_switch(tg[0], tg[1], top_fn(*tg), M, lean=(0.0, 0.3))

# ------------------------------------------------- jack, straps, back ----
back_bits = []
jp, jn, _ = P.outline_point(body_pts, (1.0, -6.3))
back_bits += P.edge_jack(jp, jn, -(0.14 + 0.14 + BODY_T - 0.25) / 2, M)     # the middle of the flat rim, between the maple edge and the back roundover
tail_p, tail_n, _ = P.outline_point(body_pts, (-5.0, 0.0))
hp, hn, _ = P.outline_point(body_pts, max(ccw(list(body_pts)), key=lambda p: p[0] if p[1] > 2 else -99))
back_bits.append(P.strap_button('strap_tail', tail_p, tail_n, -BODY_T / 2, M))
back_bits.append(P.strap_button('strap_horn', hp, hn, -BODY_T / 2, M))
# the neck plate under the heel, inside the drawn heel line
NS = [(7.95, 0.62), (7.95, -0.62), (8.75, 0.62), (8.75, -0.62)]
plate = slab('NeckPlate', rounded_rect(8.35, 0.0, 1.32, 1.70, 0.22), -BODY_T - 0.07, -BODY_T, M['chrome'], r_bot=0.02, steps=3)
back_bits.append(plate)
for i, (x, y) in enumerate(NS):
    back_bits.append(P.screw(f'plate_screw_{i}', (x, y, -BODY_T - 0.07), M, axis=(0, 0, -1), d=0.2, h=0.05))
for i, (hx, y) in enumerate(ht_holes):
    f = lathe(f'ferrule_{i}', [(0, 0.010), (0.10, 0.010), (0.10, -0.004), (0.185, -0.004), (0.19, 0.0), (0.19, 0.012), (0.185, 0.02), (0, 0.02)],
              M['chrome'], seg=32)
    back_bits.append(place(f, (hx, y, -BODY_T - 0.012)))
    back_bits.append(place(lathe(f'ferrule_hole_{i}', [(0, 0.0), (0.06, 0.0), (0.06, 0.0005), (0, 0.0005)], M['hole'], seg=20),
                           (hx, y, -BODY_T - 0.004), axis=(0, 0, -1)))

# --------------------------------------------------------------- groups ----
G['Body'] = body
G['NeckPickup'] = merge('NeckPickup', pu['NeckPickup'])
G['BridgePickup'] = merge('BridgePickup', pu['BridgePickup'])
G['Bridge'] = merge('Bridge', ht)
G['Saddles'] = merge('Saddles', ht_saddles)
G['Controls'] = merge('Controls', ctrl)
G['BackHardware'] = merge('BackHardware', back_bits)

tail_x = min(p[0] for p in body_pts)
rootob = P.assemble('Sedge', G, tail_x, -BODY_T / 2)
print(f'[sedge] objects {len(G)}, polygons {sum(len(o.data.polygons) for o in G.values())}')
bd = Vector(body.dimensions) / IN
print(f'[sedge] body {bd.x:.3f} x {bd.y:.3f} x {bd.z:.3f} in')


def dev_near(pt, r=1.3):
    sel = [d for p, d in zip(body_pts, dev) if math.dist(p, pt) < r]
    return round(float(max(sel)) * 25.4, 1) if sel else 0.0


departures = dict(bass_horn_mm=dev_near(bass_tip), treble_horn_mm=dev_near(treb_tip), bass_waist_mm=dev_near(bass_waist, 0.8),
                  treble_waist_mm=dev_near(treb_waist, 0.8))
print('[sedge] departures from the plan outline', departures)

page = dict(
    units='inch', brand=P.BRAND, model='Sedge', scale=25.5, radius=NK.radius, frets=22, nut_width=1.625,
    body=dict(length=round(bd.x, 3), width=round(bd.y, 3), depth=BODY_T),
    headstock_length=round(NK.HS_TIP, 3), overall=round(NK.HS_TIP + NK.NUT_X0 - tail_x, 3),
    body_outline=P.r3(body_pts[::2]), plan_outline=P.r3(plan_body[::4]), pickguard=[], pickguard_slot=[],
    carve_line=P.r3(D['carve_line']),
    neck=P.r3(NK.page_neck()[::2]), fret_x=[round(x, 3) for x in NK.fret_x],
    fret_span=[[round(NK.width(x)[0], 3), round(NK.width(x)[1], 3)] for x in NK.fret_x],
    nut=[NK.NUT_X0, NK.NUT_X1, NK.nut_half], posts=P.r3([(NK.NUT_X0 + a, b) for a, b in P.SIX_POSTS]), dots=P.r3(NK.marks),
    pickups=[dict(kind='humbucker', x=p[0], y=0, angle=0) for p in D['pickups']],
    bridge_plate=P.r3(rounded_rect(0.55 - 1.65 / 2, 0, 1.65, 2.75, 0.18)), knobs=P.r3(C), switch=list(tg),
    strings=[[[round(crests[i][0], 3), round(Y_BRIDGE[i], 3)], [NK.NUT_X0, round(NK.y_nut[i], 3)]] for i in range(6)],
    gauges=P.GAUGE, departures=departures,
)
json.dump(page, open(os.path.join(ROOT, 'site', 'assets', 'data', f'{ID}.json'), 'w'))

if '--no-export' not in ARGS:
    P.export(rootob, G, OUT_GLB, os.path.join(HERE, f'{ID}.blend'))
else:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, f'{ID}.blend'))
