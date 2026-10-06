"""KVELD Floe: a single-cut built from the 1950s Telecaster plans.

  blender -b -P blender/build_floe.py -- [--render] [--no-export]

Every dimension that exists on the drawings comes from
reference/telecaster/parsed/tele.json (see tools/extract_tele.py). The
headstock, logo and fret markers are KVELD's own; everything else follows
the plan: 25.5" scale, 7.25" radius, 21 frets, 1.650" nut, 1.75" ash body.

Modelling frame (inches, converted to metres on the way in):
  X along the strings, 0 at the saddle line, +X toward the headstock
  Y across, +Y is the bass side
  Z up, 0 is the top of the body
"""
import json, math, os, sys

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kveld_kit as K                     # noqa: E402
from kveld_kit import *                   # noqa: E402,F401  (shared builders, unchanged from this file)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
D = json.load(open(os.path.join(ROOT, 'reference', 'telecaster', 'parsed', 'tele.json')))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT_GLB = os.path.join(ROOT, 'site', 'assets', 'models', 'floe.glb')
OUT_TEX = os.path.join(HERE, 'textures')
OUT_RENDER = os.path.join(HERE, 'renders')

BRAND = 'KVELD'
IN = 0.0254
SCALE = D['scale']                 # 25.5
RADIUS = 7.25                      # fretboard radius
Z_BOARD = 1.01 - 0.625             # heel is 1.01 deep and sits in a 0.625 pocket
BODY_T = 1.75
NUT_X0, NUT_X1 = SCALE, SCALE + 0.12
NUT_HALF = 0.826
FRET_W, FRET_H = 0.078, 0.043

# string layout: index 0 is the low E (bass, +Y)
GAUGE = [0.046, 0.036, 0.026, 0.017, 0.013, 0.010]
WOUND = [True, True, True, False, False, False]
Y_NUT = [0.705 - i * 0.282 for i in range(6)]
Y_BRIDGE = [p[1] for p in D['string_holes']]          # 0.425 spacing, from the plan
X_HOLE = D['string_holes'][0][0]                       # -0.571
H_NUT, H_SADDLE = 0.058, 0.148                         # string underside above the board


def board_z(y, sag=1.0):
    return Z_BOARD - sag * (RADIUS - math.sqrt(max(RADIUS * RADIUS - y * y, 0.0)))


def string_bottom(i, x):
    """Underside of string i at station x, straight from nut to saddle."""
    t = x / SCALE
    y = Y_BRIDGE[i] + (Y_NUT[i] - Y_BRIDGE[i]) * t
    h = H_SADDLE + (H_NUT - H_SADDLE) * t
    return y, board_z(y) + h



# --------------------------------------------------------------- scene ----
scene = K.begin('Floe')
root_col = K.root_col


# ------------------------------------------------------------ textures ----
BODY_UV0 = (-5.95, -8.25)   # planar UV window for the body, 16.5" square
BODY_UVS = 16.5


def ash_texture(path, n=2048):
    """Flat-sawn swamp ash, two-piece, under a white blonde finish."""
    rng = np.random.default_rng(7)
    x = BODY_UV0[0] + (np.arange(n) + 0.5) / n * BODY_UVS
    y = BODY_UV0[1] + (np.arange(n) + 0.5) / n * BODY_UVS
    X, Y = np.meshgrid(x, y)
    warp = fbm(n, n, 6, 3, rng) - 0.5
    fine = fbm(n, n, 60, 8, rng) - 0.5
    pores = value_noise(n, n, 900, 60, rng)
    seam = 0.42
    ring = np.zeros_like(X)
    for side, yp, d0, slope, freq in ((1, 3.4, 2.6, 0.11, 6.5), (-1, -2.7, 3.1, -0.09, 7.2)):
        depth = d0 + slope * (X + 1.5) + 0.35 * np.sin(X * 0.45 + side)
        rho = np.sqrt(((Y - yp) * 1.0) ** 2 + depth ** 2) + 0.18 * warp + 0.02 * fine
        piece = (Y > seam) if side > 0 else (Y <= seam)
        ring = np.where(piece, rho * freq, ring)
    t = ring - np.floor(ring)
    band = np.clip((0.26 - t) / 0.08, 0, 1) * np.clip(t / 0.03, 0, 1)      # earlywood pore band
    band *= 0.55 + 0.45 * (pores > 0.35)
    lines = np.exp(-((t - 0.02) / 0.012) ** 2) * 0.35
    mott = fbm(n, n, 4, 4, rng) - 0.5
    base = np.array((0.905, 0.872, 0.800))
    dark = np.array((0.690, 0.610, 0.485))
    k = np.clip(band * 0.42 + lines * 0.5, 0, 1)[..., None]
    col = base * (1 - k) + dark * k
    col *= (1 + 0.05 * mott)[..., None]
    glue = np.exp(-((Y - seam) / 0.012) ** 2)[..., None] * 0.08
    col *= 1 - glue
    # the open pores of the earlywood sit just below the surface, the finish
    # fills them only partly: that is the relief the normal map carries
    height = -(band * 0.8 + lines * 0.5) - 0.25 * (pores > 0.6) * band - 0.6 * np.exp(-((Y - seam) / 0.01) ** 2)
    normal_png(height, BODY_UVS / n, path.replace('.png', '_normal.png'))
    return save_png(col, path)


NECK_U0, NECK_US = 6.9, 26.4          # u window along X
NECK_VS = 5.0                          # v window around the section


def maple_texture(path, w=2048, h=512):
    rng = np.random.default_rng(11)
    u = NECK_U0 + (np.arange(w) + 0.5) / w * NECK_US
    v = (np.arange(h) + 0.5) / h * NECK_VS
    U, V = np.meshgrid(u, v)
    warp = fbm(h, w, 4, 12, rng) - 0.5
    t = V * 11 + warp * 1.4
    t = t - np.floor(t)
    lines = np.exp(-((t - 0.5) / 0.05) ** 2)
    fleck = (value_noise(h, w, 260, 700, rng) > 0.93) * 0.4
    mott = fbm(h, w, 3, 10, rng) - 0.5
    base = np.array((0.900, 0.745, 0.505))
    dark = np.array((0.770, 0.585, 0.360))
    k = np.clip(lines * 0.22 + fleck * 0.25, 0, 1)[..., None]
    col = base * (1 - k) + dark * k
    col *= (1 + 0.06 * mott)[..., None]
    return save_png(col, path)


os.makedirs(OUT_TEX, exist_ok=True)
ash_png = ash_texture(os.path.join(OUT_TEX, 'floe_ash.png'))
maple_png = maple_texture(os.path.join(OUT_TEX, 'floe_maple.png'))

# Finish pass (2026-09-30): a thick, glassy nitro coat over grain relief on
# the body, full gloss on the neck, lacquered black guard, polished metals.
M_BODY = principled('Body_Ash_WhiteBlonde', (1, 1, 1), 0.34, coat=1.0, coat_rough=0.018, tex=ash_png,
                    normal=ash_png.replace('.png', '_normal.png'), normal_strength=0.7)
M_NECK = principled('Neck_Maple', (1, 1, 1), 0.32, coat=1.0, coat_rough=0.032, tex=maple_png)
M_GUARD = principled('Pickguard_Black', srgb((0.022, 0.021, 0.02)), 0.34, coat=1.0, coat_rough=0.03)
M_CHROME = principled('Chrome', srgb((0.95, 0.95, 0.96)), 0.045, metal=1.0)
M_NICKEL = principled('Nickel', srgb((0.88, 0.85, 0.78)), 0.11, metal=1.0)
M_STEEL = principled('Steel_Plate', srgb((0.87, 0.87, 0.88)), 0.2, metal=1.0)
M_BRASS = principled('Brass', srgb((0.89, 0.69, 0.41)), 0.16, metal=1.0)
M_FRET = principled('Fret_NickelSilver', srgb((0.86, 0.85, 0.81)), 0.09, metal=1.0)
M_STR_PLAIN = principled('String_Plain', srgb((0.9, 0.89, 0.87)), 0.1, metal=1.0)
M_STR_WOUND = principled('String_Wound', srgb((0.76, 0.73, 0.68)), 0.3, metal=1.0)
M_BONE = principled('Bone', srgb((0.93, 0.89, 0.80)), 0.42)
M_FIBRE = principled('Flatwork_Black', srgb((0.028, 0.025, 0.022)), 0.62)
M_COPPER = principled('Coil_Copper', srgb((0.80, 0.44, 0.24)), 0.32, metal=1.0)
M_POLE = principled('Alnico', srgb((0.62, 0.62, 0.63)), 0.36, metal=1.0)
M_DOT = principled('Dot_Black', srgb((0.02, 0.02, 0.02)), 0.35, coat=1.0, coat_rough=0.032)   # under the neck's finish
M_LOGO = principled('Logo_Black', srgb((0.015, 0.015, 0.015)), 0.25, coat=1.0, coat_rough=0.032)
M_WALNUT = principled('Walnut', srgb((0.36, 0.22, 0.12)), 0.35, coat=1.0, coat_rough=0.032)
M_PLASTIC = principled('Plastic_Black', srgb((0.03, 0.03, 0.03)), 0.28)
M_HOLE = principled('Hole_Dark', srgb((0.01, 0.01, 0.01)), 0.9)


# ------------------------------------------------------ mesh builders ----
# ------------------------------------------------------ mesh builders ----
# (kveld_kit.py)

# ---------------------------------------------------------------- BODY ----
body_pts = D['body_outline']
# thin the plan outline to ~0.06" spacing
body_pts = body_pts[::2]
pocket = D['neck_pocket']


def body_radius(p):
    x, y = p
    # the drawing keeps the neck socket area square: no roundover there
    if x > pocket['x_open'] - 0.35 and abs(y) < pocket['half_width'] + 0.35:
        return 0.08
    return 1.0


body = slab('Body', body_pts, -BODY_T, 0.0, M_BODY, r_top=0.125, r_bot=0.125, steps=6,
            r_fn=body_radius, uv_origin=BODY_UV0, uv_size=BODY_UVS)

# ------------------------------------------------------------ PICKGUARD ----
pg = slab('Pickguard', D['pickguard_outline'], 0.0, 0.06, M_GUARD, r_top=0.02, steps=2,
          holes=[D['pickguard_neck_slot']], uv_origin=BODY_UV0, uv_size=BODY_UVS)


def screw(name, loc, axis=(0, 0, 1), d=0.19, h=0.045, mat=None):
    r = d / 2
    prof = [(0, h)] + [(r * math.sin(a), h * math.cos(a) * 0.9 + 0.0) for a in np.linspace(0.15, math.pi / 2, 6)] + [(r, 0), (r * 0.9, -0.01), (0, -0.01)]
    ob = lathe(name, prof, mat or M_CHROME, seg=20)
    return place(ob, loc, axis)


parts = {'screws': []}
for i, (x, y) in enumerate(D['pickguard_screws']):
    parts['screws'].append(screw(f'pg_screw_{i}', (x, y, 0.06)))
for i, (x, y) in enumerate(D['neck_pickup_screws']):
    parts['screws'].append(screw(f'np_screw_{i}', (x, y, 0.06)))

# --------------------------------------------------------- NECK PICKUP ----
slot = D['pickguard_neck_slot']
sx = [p[0] for p in slot]; sy = [p[1] for p in slot]
np_cx, np_cy = (min(sx) + max(sx)) / 2, (min(sy) + max(sy)) / 2
neck_pu = slab('NeckPickup', stadium(np_cx, np_cy, max(sy) - min(sy) - 0.03, max(sx) - min(sx) - 0.03),
               -0.25, 0.33, M_CHROME, r_top=0.07, steps=5)
transform_obj(neck_pu, Matrix.Translation((np_cx * IN, np_cy * IN, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'Z') @ Matrix.Translation((-np_cx * IN, -np_cy * IN, 0)))

# -------------------------------------------------------------- BRIDGE ----
PLATE_X0, PLATE_X1, PLATE_HW, PLATE_T = -0.95, 2.72, 1.62, 0.045
BP_ANGLE = math.radians(-10.0)          # bridge pickup slant from the plan route: treble end nearer the saddles
BP_CX = 1.66
outer = rounded_rect((PLATE_X0 + PLATE_X1) / 2, 0, PLATE_X1 - PLATE_X0, PLATE_HW * 2, 0.12)
cut = rounded_rect(BP_CX, 0, 0.80, 2.86, 0.1, rot=BP_ANGLE)
plate = slab('BridgePlate', outer, 0.0, PLATE_T, M_STEEL, r_top=0.012, steps=2, holes=[cut])




wall_prof = [(PLATE_X0, PLATE_T), (1.85, PLATE_T), (2.55, PLATE_T), (2.55, 0.10), (1.85, 0.40), (PLATE_X0 + 0.08, 0.40), (PLATE_X0, 0.36)]
walls = [prism_xz('wall_bass', wall_prof, PLATE_HW - 0.045, PLATE_HW, M_STEEL),
         prism_xz('wall_treble', wall_prof, -PLATE_HW, -PLATE_HW + 0.045, M_STEEL),
         prism_xz('wall_rear', [(PLATE_X0, PLATE_T), (PLATE_X0 + 0.045, PLATE_T), (PLATE_X0 + 0.045, 0.40), (PLATE_X0, 0.36)],
                  -PLATE_HW + 0.02, PLATE_HW - 0.02, M_STEEL)]
bridge_bits = [plate] + walls
for i, (x, y) in enumerate(D['bridge_screws']):
    bridge_bits.append(screw(f'br_screw_{i}', (x, y, PLATE_T), d=0.17, h=0.04))
for i, y in enumerate(Y_BRIDGE):
    h = lathe(f'str_hole_{i}', [(0, 0.001), (0.055, 0.001), (0.055, 0.0), (0, 0.0)], M_HOLE, seg=16)
    bridge_bits.append(place(h, (X_HOLE, y, PLATE_T)))

# saddles: three compensated brass barrels, each carrying two strings
SADDLE_X = [-0.10, -0.045, -0.075]
saddles = []
saddle_top = {}
for k in range(3):
    i0, i1 = 2 * k, 2 * k + 1
    yc = (Y_BRIDGE[i0] + Y_BRIDGE[i1]) / 2
    zs = [board_z(Y_BRIDGE[i]) + H_SADDLE for i in (i0, i1)]
    rad = 0.14
    zc = sum(zs) / 2 - rad
    tilt = math.atan2(zs[0] - zs[1], Y_BRIDGE[i0] - Y_BRIDGE[i1])
    prof = [(0, -0.40), (0.10, -0.40), (0.125, -0.39), (rad, -0.37), (rad, 0.37), (0.125, 0.39), (0.10, 0.40), (0, 0.40)]
    b = lathe(f'saddle_{k}', prof, M_BRASS, seg=28)
    b.matrix_world = (Matrix.Translation(Vector((SADDLE_X[k], yc, zc)) * IN) @ Matrix.Rotation(tilt, 4, 'X')
                      @ Matrix.Rotation(-math.pi / 2, 4, 'X'))
    saddles.append(b)
    for i in (i0, i1):
        saddle_top[i] = (SADDLE_X[k], Y_BRIDGE[i], board_z(Y_BRIDGE[i]) + H_SADDLE)
    # height screws under each end and the intonation screw to the rear wall
    for dy in (-0.30, 0.30):
        hs = lathe(f'hs_{k}_{dy}', [(0, 0), (0.035, 0), (0.035, zc - PLATE_T), (0, zc - PLATE_T)], M_STEEL, seg=10)
        saddles.append(place(hs, (SADDLE_X[k], yc + dy, PLATE_T)))
    ln = SADDLE_X[k] - PLATE_X0
    isc = lathe(f'iscrew_{k}', [(0, 0), (0.075, 0), (0.075, 0.05), (0.032, 0.05), (0.032, ln + 0.05), (0, ln + 0.05)], M_STEEL, seg=12)
    saddles.append(place(isc, (PLATE_X0 - 0.05, yc, zc - 0.02), axis=(1, 0, 0)))
    spring = []
    for s in range(90):
        a = s / 90 * 2 * math.pi * 5
        spring.append((PLATE_X0 + 0.06 + (SADDLE_X[k] - PLATE_X0 - 0.2) * s / 89, yc + 0.06 * math.cos(a), zc - 0.02 + 0.06 * math.sin(a)))
    saddles.append(tube(f'spring_{k}', spring, 0.009, M_STEEL, sides=6))

# bridge pickup: black top, exposed copper coil, staggered alnico poles
bp = []
bp.append(slab('bp_top', rounded_rect(BP_CX, 0, 0.72, 2.72, 0.14, rot=BP_ANGLE), 0.24, 0.30, M_FIBRE))
bp.append(slab('bp_coil', rounded_rect(BP_CX, 0, 0.56, 2.52, 0.2, rot=BP_ANGLE), -0.30, 0.24, M_COPPER))
stagger = [0.030, 0.034, 0.042, 0.038, 0.030, 0.026]
for i in range(6):
    along = (Y_BRIDGE[i] + (Y_NUT[i] - Y_BRIDGE[i]) * BP_CX / SCALE)
    px = BP_CX - along * math.tan(BP_ANGLE)
    pole = lathe(f'pole_{i}', [(0, 0.30 + stagger[i]), (0.085, 0.30 + stagger[i]), (0.0975, 0.29 + stagger[i]), (0.0975, 0.24), (0, 0.24)], M_POLE, seg=16)
    bp.append(place(pole, (px, along, 0)))
for (dx, dy) in ((0, 1.52), (0, -1.52), (-0.46, 0.0)):
    c, s = math.cos(BP_ANGLE), math.sin(BP_ANGLE)
    x = BP_CX + dx * c - dy * s; y = dx * s + dy * c
    bp.append(screw(f'bp_screw_{dx}_{dy}', (x, y, PLATE_T), d=0.16, h=0.04))

# ------------------------------------------------------ CONTROL PLATE ----
cs = D['control_plate_screws']
cp_y = cs[0][1]
cp_x0, cp_x1 = min(c[0] for c in cs) - 0.22, max(c[0] for c in cs) + 0.22
ctrl = [slab('ControlPlate', stadium((cp_x0 + cp_x1) / 2, cp_y, cp_x1 - cp_x0, 1.24), 0.0, 0.06, M_CHROME, r_top=0.02, steps=3)]
for i, (x, y) in enumerate(cs):
    ctrl.append(screw(f'cp_screw_{i}', (x, y, 0.06), d=0.17, h=0.04))
KNOB_X = [0.10, -1.50]
for i, x in enumerate(KNOB_X):
    prof = [(0, 0.66), (0.10, 0.655), (0.22, 0.64), (0.31, 0.62), (0.355, 0.60), (0.37, 0.57), (0.37, 0.16), (0.36, 0.14), (0.30, 0.13),
            (0.14, 0.13), (0.14, 0.06), (0, 0.06)]
    k = lathe(f'knob_{i}', prof, M_CHROME, seg=128, knurl=(0.155, 0.575, 64, 0.018), sharp=30)
    ctrl.append(place(k, (x, cp_y, 0.0), spin=0.3 * i))
sw_x = 1.72
lever = prism_xz('switch_lever', [(-0.025, 0.06), (0.025, 0.06), (0.10, 0.62), (0.05, 0.62)], cp_y - 0.04, cp_y + 0.04, M_STEEL)
transform_obj(lever, Matrix.Translation((sw_x * IN, 0, 0)))
ctrl.append(lever)
tip = lathe('switch_tip', [(0, 0.93), (0.10, 0.93), (0.15, 0.91), (0.17, 0.86), (0.17, 0.64), (0.14, 0.60), (0.06, 0.58), (0, 0.58)], M_PLASTIC, seg=24)
ctrl.append(place(tip, (sw_x + 0.075, cp_y, 0.0), axis=(0.09, 0, 1)))
slot_ob = slab('switch_slot', stadium(sw_x, cp_y, 0.62, 0.09), 0.06, 0.061, M_HOLE)
ctrl.append(slot_ob)

# ------------------------------------------------ JACK, STRAPS, BACK ----
outline = ccw(list(body_pts)); onrm = vnormals(outline)


def edge_point(target):
    i = min(range(len(outline)), key=lambda k: math.dist(outline[k], target))
    return outline[i], onrm[i]


jb = D['jack_bore']
d = (jb[1][0] - jb[0][0], jb[1][1] - jb[0][1]); L = math.hypot(*d); d = (d[0] / L, d[1] / L)
best = min(range(len(outline)), key=lambda k: abs((outline[k][0] - jb[0][0]) * d[1] - (outline[k][1] - jb[0][1]) * d[0])
           + (0 if (outline[k][0] - jb[0][0]) * d[0] + (outline[k][1] - jb[0][1]) * d[1] > 0 else 99))
jp, jn = outline[best], onrm[best]
back_bits = []
cup = lathe('jack_cup', [(0, -0.36), (0.20, -0.36), (0.34, -0.20), (0.40, -0.02), (0.46, 0.0), (0.46, 0.012), (0.40, 0.012), (0.34, -0.01),
                         (0.28, -0.18), (0.16, -0.30), (0, -0.30)], M_CHROME, seg=40)
back_bits.append(place(cup, (jp[0], jp[1], -BODY_T / 2), axis=(jn[0], jn[1], 0)))
nut_j = lathe('jack_nut', [(0, -0.20), (0.18, -0.20), (0.18, -0.12), (0.10, -0.12), (0.10, -0.05), (0, -0.05)], M_NICKEL, seg=6)
back_bits.append(place(nut_j, (jp[0], jp[1], -BODY_T / 2), axis=(jn[0], jn[1], 0)))
hole_j = lathe('jack_hole', [(0, -0.1245), (0.075, -0.1245), (0.075, -0.124), (0, -0.124)], M_HOLE, seg=16)
back_bits.append(place(hole_j, (jp[0], jp[1], -BODY_T / 2), axis=(jn[0], jn[1], 0)))

strap_prof = [(0, 0.30), (0.14, 0.30), (0.24, 0.27), (0.26, 0.23), (0.24, 0.19), (0.12, 0.16), (0.10, 0.10), (0.10, 0.03), (0.22, 0.02), (0.22, 0.0), (0, 0.0)]
tail = min(range(len(outline)), key=lambda k: outline[k][0] + abs(outline[k][1]) * 0.2)
horn = max((k for k in range(len(outline)) if outline[k][1] > 3.0), key=lambda k: outline[k][0])
for nm, k in (('strap_tail', tail), ('strap_horn', horn)):
    p, q = outline[k], onrm[k]
    back_bits.append(place(lathe(nm, strap_prof, M_CHROME, seg=32), (p[0], p[1], -BODY_T / 2), axis=(q[0], q[1], 0)))

ns = D['neck_screws']
nx0 = min(p[0] for p in ns); nx1 = max(p[0] for p in ns)
neck_plate = slab('NeckPlate', rounded_rect((nx0 + nx1) / 2, 0, 2.52, 2.02, 0.22), -BODY_T - 0.07, -BODY_T, M_CHROME, r_bot=0.02, steps=3)
back_bits.append(neck_plate)
for i, (x, y) in enumerate(ns):
    back_bits.append(screw(f'plate_screw_{i}', (x, y, -BODY_T - 0.07), axis=(0, 0, -1), d=0.2, h=0.05))
for i, y in enumerate(Y_BRIDGE):
    # the cup's floor stands 0.002 off the body's back and the dark hole 0.002
    # off the floor: level surfaces here flickered from across the room
    f = lathe(f'ferrule_{i}', [(0, 0.010), (0.10, 0.010), (0.10, -0.004), (0.185, -0.004), (0.19, 0.0), (0.19, 0.012), (0.185, 0.02), (0, 0.02)],
              M_CHROME, seg=32)
    back_bits.append(place(f, (X_HOLE, y, -BODY_T - 0.012), axis=(0, 0, 1)))
    back_bits.append(place(lathe(f'ferrule_hole_{i}', [(0, 0.0), (0.06, 0.0), (0.06, 0.0005), (0, 0.0005)], M_HOLE, seg=20),
                           (X_HOLE, y, -BODY_T - 0.004), axis=(0, 0, -1)))

# ---------------------------------------------------------------- NECK ----
prof = sorted(D['neck_profile'])
PX = np.array([p[0] for p in prof]); PTOP = np.array([p[1] for p in prof]); PBACK = np.array([p[2] for p in prof])
nw = sorted(D['neck_width'])
WX = np.array([p[0] for p in nw]); WL = np.array([p[1] for p in nw]); WR = np.array([p[2] for p in nw])
HEEL_X = pocket['x_floor']

# KVELD headstock: six in line, straight bass edge parallel to the posts,
# a slanted, rounded tip. Measured from the fret-side face of the nut.
L_EDGE = lambda xh: 1.249 - 0.3053 * (xh - 1.826)
HS_CTRL = ([(0.12, NUT_HALF), (0.40, 0.85), (0.75, 0.98), (1.10, 1.21), (1.45, 1.355)]
           + [(xh, L_EDGE(xh)) for xh in (2.3, 3.2, 4.1, 5.0, 5.8)]
           + [(6.35, -0.13), (6.85, -0.27), (7.14, -0.45), (7.27, -0.68), (7.21, -0.92), (7.0, -1.075), (6.6, -1.145),
              (5.8, -1.14), (4.8, -1.06), (3.8, -1.005), (2.8, -1.0), (1.9, -1.005), (1.2, -0.975), (0.7, -0.905), (0.35, -0.85), (0.12, -NUT_HALF)])
hs = catmull(HS_CTRL, per=16, closed=False)
tip_i = max(range(len(hs)), key=lambda k: hs[k][0])
bass_edge = hs[:tip_i + 1]; treb_edge = hs[tip_i:][::-1]
HS_TIP = hs[tip_i][0]


def edge_fn(edge):
    xs = [NUT_X0 + p[0] for p in edge]; ys = [p[1] for p in edge]
    xs = np.maximum.accumulate(np.array(xs))
    return lambda x: float(np.interp(x, xs, ys))


BASS, TREB = edge_fn(bass_edge), edge_fn(treb_edge)


def neck_section(x):
    """Cross-section loop at station x: [(y, z)] plus the params."""
    if x <= NUT_X0:
        yl = float(np.interp(x, WX, WL)); yr = float(np.interp(x, WX, WR)); sag = 1.0
    elif x <= NUT_X1:
        yl, yr = -NUT_HALF, NUT_HALF; sag = 1.0 - (x - NUT_X0) / (NUT_X1 - NUT_X0)
    else:
        yl, yr = TREB(x), BASS(x); sag = 0.0
    top = Z_BOARD + float(np.interp(x, PX, PTOP))
    back = Z_BOARD + float(np.interp(x, PX, PBACK))
    # carve: boxy heel and headstock, a U through the playing range
    def blend(a, b, t):
        t = min(max(t, 0), 1); t = t * t * (3 - 2 * t); return a + (b - a) * t
    if x < 11.2:
        n = blend(9.0, 2.35, (x - 10.1) / 1.1)
    elif x > 24.0:
        n = blend(2.35, 9.0, (x - 24.0) / 1.9)
    else:
        n = 2.35
    width = yr - yl
    rs = min(0.055 if x <= NUT_X1 else 0.07, width / 2.2)
    zl = top - sag * (RADIUS - math.sqrt(RADIUS ** 2 - yl ** 2))
    zr = top - sag * (RADIUS - math.sqrt(RADIUS ** 2 - yr ** 2))
    pts = []
    NT = 22
    for k in range(NT + 1):
        y = (yl + rs) + (yr - yl - 2 * rs) * k / NT
        pts.append((y, top - sag * (RADIUS - math.sqrt(RADIUS ** 2 - y * y))))
    for k in range(1, 6):
        a = math.pi / 2 - math.pi / 2 * k / 5
        pts.append((yr - rs + rs * math.cos(a), zr - rs + rs * math.sin(a)))
    z0 = (zl + zr) / 2 - rs
    yc = (yl + yr) / 2; aa = width / 2; bb = max(z0 - back, 0.05)
    dense = []
    for k in range(1, 200):
        th = math.pi * k / 200
        c, s = math.cos(th), math.sin(th)
        dense.append((yc + aa * math.copysign(abs(c) ** (2 / n), c), z0 - bb * abs(s) ** (2 / n)))
    seg = [(yr, zr - rs)] + dense + [(yl, zl - rs)]
    cum = [0]
    for p, q in zip(seg, seg[1:]):
        cum.append(cum[-1] + math.dist(p, q))
    NB = 44
    for k in range(1, NB):
        t = cum[-1] * k / NB
        j = next(j for j in range(1, len(cum)) if cum[j] >= t)
        f = (t - cum[j - 1]) / ((cum[j] - cum[j - 1]) or 1)
        pts.append((seg[j - 1][0] + (seg[j][0] - seg[j - 1][0]) * f, seg[j - 1][1] + (seg[j][1] - seg[j - 1][1]) * f))
    pts.append((yl, zl - rs))
    for k in range(1, 5):
        a = math.pi - math.pi / 2 * k / 5
        pts.append((yl + rs + rs * math.cos(a), zl - rs + rs * math.sin(a)))
    return pts, dict(yl=yl, yr=yr, top=top, back=back, n=n, z0=z0, bb=bb, yc=yc, aa=aa, sag=sag)


stations = []
x = HEEL_X + 0.002
while x < HS_TIP + NUT_X0 - 0.004:
    stations.append(x)
    if x < HEEL_X + 0.4 or x > HS_TIP + NUT_X0 - 0.5:
        x += 0.02
    elif NUT_X0 - 0.3 < x < NUT_X0 + 1.6:
        x += 0.04
    else:
        x += 0.12
stations.append(HS_TIP + NUT_X0 - 0.004)

verts, faces, fuv = [], [], []
ring_n = None
for x in stations:
    pts, _ = neck_section(x)
    ring_n = len(pts)
    cum = [0]
    for p, q in zip(pts, pts[1:] + pts[:1]):
        cum.append(cum[-1] + math.dist(p, q))
    for (y, z) in pts:
        verts.append((x, y, z))
    stations_uv = [((x - NECK_U0) / NECK_US, c / NECK_VS) for c in cum]
    fuv.append(stations_uv)
FUV = fuv
fuv = []
for s in range(len(stations) - 1):
    for k in range(ring_n):
        k2 = (k + 1) % ring_n
        a, b, c, d = s * ring_n + k, s * ring_n + k2, (s + 1) * ring_n + k2, (s + 1) * ring_n + k
        faces.append([a, d, c, b])
        ua, ub = FUV[s][k], FUV[s][k + 1]
        uc, ud = FUV[s + 1][k + 1], FUV[s + 1][k]
        fuv.append([ua, ud, uc, ub])
# end caps with their own vertices so they stay flat
for s, flip in ((0, True), (len(stations) - 1, False)):
    base = len(verts)
    ring = verts[s * ring_n:(s + 1) * ring_n]
    for v in ring:
        verts.append(v)
    f = list(range(base, base + ring_n))
    faces.append(f[::-1] if flip else f)
    fuv.append([((v[1] + 2) / NECK_US, (v[2] + 2) / NECK_VS) for v in ring][::-1 if flip else 1])
neck = obj_from('Neck', verts, faces, M_NECK, uvs=fuv, smooth_angle=60)

# skunk stripe: walnut strip along the back centreline
ss = D['skunk_stripe']
SK_COLS = 9
sk_verts, sk_faces = [], []
xs = np.linspace(ss['x0'], ss['x1'], 160)
hw = ss['width'] / 2
for i, x in enumerate(xs):
    _, P = neck_section(float(x))
    endfade = min(1.0, (x - ss['x0']) / hw, (ss['x1'] - x) / hw)
    w = hw * math.sqrt(max(0.0, 1 - (1 - endfade) ** 2)) if endfade < 1 else hw
    # nine columns across: with three, the flat chords dipped back into the
    # curved neck and the stripe flickered through it
    for y in np.linspace(-w, w, SK_COLS):
        u = abs(y - P['yc']) / P['aa']
        z = P['z0'] - P['bb'] * (max(0.0, 1 - u ** P['n'])) ** (1 / P['n']) - 0.004
        sk_verts.append((float(x), float(y), z))
for i in range(len(xs) - 1):
    for j in range(SK_COLS - 1):
        a = i * SK_COLS + j
        sk_faces.append([a, a + 1, a + SK_COLS + 1, a + SK_COLS])
skunk = obj_from('SkunkStripe', sk_verts, sk_faces, M_WALNUT, smooth_angle=60)

# frets
fret_v, fret_f = [], []
for n, fx in enumerate(D['frets']):
    yl = float(np.interp(fx, WX, WL)) + 0.018; yr = float(np.interp(fx, WX, WR)) - 0.018
    NY, NC = 40, 12
    base = len(fret_v)
    for i in range(NY + 1):
        y = yl + (yr - yl) * i / NY
        endd = min(y - yl, yr - y)
        hk = min(1.0, 0.25 + endd / 0.07)        # bevelled fret ends
        zb = board_z(y) - 0.004
        for j in range(NC + 1):
            a = math.pi * j / NC
            dx = -math.cos(a) * FRET_W / 2
            dz = math.sin(a) ** 0.7 * FRET_H * hk
            fret_v.append((fx + dx, y, zb + 0.004 + dz))
    for i in range(NY):
        for j in range(NC):
            a = base + i * (NC + 1) + j
            fret_f.append([a, a + 1, a + NC + 2, a + NC + 1])
    for i in (0, NY):
        ring = [base + i * (NC + 1) + j for j in range(NC + 1)]
        fret_f.append(ring if i == 0 else ring[::-1])
frets = obj_from('Frets', fret_v, fret_f, M_FRET, smooth_angle=70)

# position markers: black dots on the board and the bass-side edge
dots = []
seen = []
for x, y in D['dots']:
    if any(abs(x - a) < 0.05 and abs(y - b) < 0.15 for a, b in seen):
        continue
    seen.append((x, y))
for i, (x, y) in enumerate(seen):
    tilt = math.asin(y / RADIUS)
    dot = lathe(f'dot_{i}', [(0, 0.004), (0.125, 0.004), (0.125, -0.02), (0, -0.02)], M_DOT, seg=36)   # 0.1 mm proud: 0.001 flickered
    place(dot, (x, y, board_z(y)), axis=(0, math.sin(tilt), math.cos(tilt)))
    dots.append(dot)
    if abs(y) < 0.1 or y > 0:
        _, P = neck_section(x)
        side = lathe(f'sdot_{i}', [(0, 0.004), (0.04, 0.004), (0.04, -0.02), (0, -0.02)], M_DOT, seg=16)
        place(side, (x, P['yr'] + 0.0005, board_z(P['yr']) - 0.14), axis=(0, 1, 0))
        dots.append(side)

# nut
nut_v, nut_f = [], []
NN = 30
for i in range(NN + 1):
    y = -NUT_HALF + 2 * NUT_HALF * i / NN
    zt = board_z(y) + H_NUT - 0.012
    for x, z in ((NUT_X0, board_z(y) - 0.08), (NUT_X0, zt), (NUT_X1, zt - 0.015), (NUT_X1, board_z(y) - 0.08)):
        nut_v.append((x, y, z))
for i in range(NN):
    for j in range(4):
        a = i * 4 + j; b = i * 4 + (j + 1) % 4
        nut_f.append([a, b, b + 4, a + 4])
nut_f.append([0, 1, 2, 3][::-1]); nut_f.append([NN * 4 + k for k in range(4)])
nut = obj_from('Nut', nut_v, nut_f, M_BONE, smooth_angle=40, recalc=True)

# ----------------------------------------------------------- HEADSTOCK ----
FACE_Z = Z_BOARD + float(np.interp(NUT_X0 + 3, PX, PTOP))
BACK_Z = Z_BOARD + float(np.interp(NUT_X0 + 3, PX, PBACK))
tuners = []
wrap_info = []
for i, (px_, py_) in enumerate(D['tuner_posts']):
    # the plan lists posts nearest-the-nut first, which is the low E
    bush = lathe(f'bushing_{i}', [(0, 0.05), (0.13, 0.05), (0.165, 0.035), (0.17, 0.0), (0, 0.0)], M_NICKEL, seg=28)
    tuners.append(place(bush, (px_, py_, FACE_Z)))
    post = lathe(f'post_{i}', [(0, 0.47), (0.10, 0.47), (0.118, 0.455), (0.118, 0.0), (0, 0.0)], M_NICKEL, seg=24)
    tuners.append(place(post, (px_, py_, FACE_Z)))
    slotm = slab(f'post_slot_{i}', rounded_rect(px_, py_, 0.03, 0.2, 0.012, rot=0.6), FACE_Z + 0.4725, FACE_Z + 0.4735, M_HOLE)
    tuners.append(slotm)
    # top face sunk 0.03 into the wood: level with the back it flickered against it
    housing = slab(f'housing_{i}', rounded_rect(px_, py_ + 0.16, 0.56, 0.78, 0.1), BACK_Z - 0.36, BACK_Z + 0.03, M_NICKEL, r_bot=0.1, steps=4)
    tuners.append(housing)
    shaft = lathe(f'shaft_{i}', [(0, 0), (0.06, 0), (0.06, 0.34), (0, 0.34)], M_NICKEL, seg=12)
    tuners.append(place(shaft, (px_, py_ + 0.52, BACK_Z - 0.2), axis=(0, 1, 0)))
    key = slab(f'key_{i}', ellipse(0, 0, 0.31, 0.24), -0.05, 0.05, M_NICKEL, r_top=0.03, r_bot=0.03, steps=3)
    turn = math.radians((17, -24, 9, -13, 26, -6)[i])     # keys stop wherever tuning left them
    transform_obj(key, Matrix.Translation(Vector((px_, py_ + 1.13, BACK_Z - 0.2)) * IN) @ Matrix.Rotation(turn, 4, 'Y')
                  @ Matrix(((0, -1, 0, 0), (1, 0, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1))))
    tuners.append(key)
    wrap_info.append((px_, py_))
tuners = [t for t in tuners if t]

# string tree for the B and E strings
tree_x = 28.95
tree_y = None

# logo decal
# Panchang Medium (Fontshare, free licence), the page's display face. It runs
# wide, so it is set smaller than the old serif to fill the same 1.3 in.
font = bpy.data.fonts.load(os.path.join(HERE, 'fonts', 'Panchang-Medium.ttf'))
tc = bpy.data.curves.new('logo', 'FONT')
tc.body = BRAND
tc.font = font
tc.size = 0.272 * IN
tc.space_character = 1.22
tc.align_x = 'CENTER'; tc.align_y = 'CENTER'
tc.extrude = 0.0006 * IN
to = bpy.data.objects.new('logo_text', tc)
root_col.objects.link(to)
bpy.context.view_layer.update()
deps = bpy.context.evaluated_depsgraph_get()
me = bpy.data.meshes.new_from_object(to.evaluated_get(deps))
bpy.data.objects.remove(to)
logo = bpy.data.objects.new('Logo', me)
root_col.objects.link(logo)
me.materials.clear(); me.materials.append(M_LOGO)
logo.location = Vector((27.82, -0.64, FACE_Z + 0.003)) * IN

# -------------------------------------------------------------- STRINGS ----
strings = []
for i in range(6):
    r = GAUGE[i] / 2
    px_, py_ = wrap_info[i]
    sx_, sy_, sz_ = saddle_top[i]
    y_n = Y_NUT[i]
    z_n = board_z(y_n) + H_NUT
    post_r = 0.118 + r
    # leave the post on its treble-facing side, tangent to the run back to the nut
    dxn, dyn = NUT_X0 - px_, y_n - py_
    ln = math.hypot(dxn, dyn); ux, uy = dxn / ln, dyn / ln
    tx, ty = px_ - uy * post_r, py_ + ux * post_r
    wrap_z = FACE_Z + 0.10 + (0.16 if i in (4, 5) else 0.05 + 0.03 * i)
    path = [(X_HOLE, Y_BRIDGE[i], PLATE_T), (sx_, sy_, sz_ + r), (NUT_X0, y_n, z_n + r), (NUT_X1, y_n, z_n + r - 0.012)]
    if i in (4, 5):
        # under the string tree
        t = (tree_x - NUT_X1) / (tx - NUT_X1)
        ty_ = y_n + (ty - y_n) * t
        path.append((tree_x, ty_, FACE_Z + 0.13 + r))
        if tree_y is None:
            tree_y = ty_
        else:
            tree_y = (tree_y + ty_) / 2
    path.append((tx, ty, wrap_z + r))
    # a few turns around the post, winding down
    turns = 2.2 if WOUND[i] else 3.4
    a0 = math.atan2(ty - py_, tx - px_)
    coil = []
    for s in range(1, 64):
        a = a0 + s / 63 * turns * 2 * math.pi
        coil.append((px_ + post_r * math.cos(a), py_ + post_r * math.sin(a), wrap_z + r - s / 63 * (GAUGE[i] * 1.05 * turns)))
    path += coil
    strings.append(tube(f'string_{i}', path, r, M_STR_WOUND if WOUND[i] else M_STR_PLAIN, sides=10 if WOUND[i] else 8))

tree_base = lathe('tree_base', [(0, 0.13), (0.06, 0.13), (0.06, 0.0), (0, 0.0)], M_CHROME, seg=16)
tuners.append(place(tree_base, (tree_x, tree_y, FACE_Z)))
tree_wing = slab('tree_wing', rounded_rect(tree_x, tree_y, 0.16, 0.46, 0.07), FACE_Z + 0.13 + 0.0115, FACE_Z + 0.16, M_CHROME, r_top=0.01, steps=2)
tuners.append(tree_wing)
tuners.append(screw('tree_screw', (tree_x, tree_y, FACE_Z + 0.16), d=0.12, h=0.03))

# --------------------------------------------------------------- GROUPS ----
G = {}
G['Body'] = body
G['Pickguard'] = pg
G['Screws'] = merge('Screws', parts['screws'] + ctrl[1:3])
G['NeckPickup'] = neck_pu
G['Bridge'] = merge('Bridge', bridge_bits)
G['Saddles'] = merge('Saddles', saddles)
G['BridgePickup'] = merge('BridgePickup', bp)
G['Controls'] = merge('Controls', [ctrl[0]] + ctrl[3:])
G['Hardware_Back'] = merge('BackHardware', back_bits)
G['Neck'] = neck
G['SkunkStripe'] = skunk
G['Frets'] = frets
G['Dots'] = merge('Dots', dots)
G['Nut'] = nut
G['Tuners'] = merge('Tuners', tuners)
G['Logo'] = logo
G['Strings'] = merge('Strings', strings)

# One root. The modelling frame lies flat; stand the guitar upright facing -Y
# (Blender front view), tail at the origin, so glTF gets +Y up, facing +Z.
rootob = bpy.data.objects.new('KVELD_Floe', None)
root_col.objects.link(rootob)
tail_x = min(p[0] for p in body_pts)
upright = Matrix(((0, -1, 0, 0), (0, 0, -1, 0), (1, 0, 0, 0), (0, 0, 0, 1)))
for ob in G.values():
    ob.parent = rootob
rootob.matrix_world = upright @ Matrix.Translation(Vector((-tail_x, 0, BODY_T / 2)) * IN)

bpy.context.view_layer.update()
tri = sum(len(o.data.polygons) for o in G.values())
print(f'[floe] objects {len(G)}, polygons {tri}')
body_dims = Vector(body.dimensions) / IN
print(f'[floe] body {body_dims.x:.3f} x {body_dims.y:.3f} x {body_dims.z:.3f} in (plan: 15.96 x 12.758 x 1.75)')

# ------------------------------------------------------ page data ----
# The blueprint on the landing page is drawn from these numbers, the same
# ones that built the mesh, so the drawing and the model cannot disagree.
def r3(pts):
    return [[round(a, 3), round(b, 3)] for a, b in pts]


neck_loop = ([(x, yr) for x, yr in zip(WX, WR)]
             + [(NUT_X0 + p[0], p[1]) for p in bass_edge] + [(NUT_X0 + p[0], p[1]) for p in treb_edge[::-1]]
             + [(x, yl) for x, yl in zip(WX[::-1], WL[::-1])])
page = dict(
    units='inch', brand=BRAND, model='Floe', scale=SCALE, radius=RADIUS, frets=len(D['frets']),
    nut_width=round(2 * NUT_HALF, 3), body=dict(length=15.96, width=12.758, depth=BODY_T),
    neck_length=round(D['neck_length'], 3), headstock_length=round(HS_TIP, 3),
    overall=round(HS_TIP + NUT_X0 - min(p[0] for p in body_pts), 3),
    body_outline=r3(body_pts[::2]), pickguard=r3(D['pickguard_outline'][::2]), pickguard_slot=r3(D['pickguard_neck_slot'][::2]),
    neck=r3(neck_loop[::2]), fret_x=[round(x, 3) for x in D['frets']],
    fret_span=[[round(float(np.interp(x, WX, WL)), 3), round(float(np.interp(x, WX, WR)), 3)] for x in D['frets']],
    nut=[NUT_X0, NUT_X1, NUT_HALF], posts=r3(D['tuner_posts']), dots=r3(seen),
    bridge_plate=r3(outer), bridge_pickup=r3(rounded_rect(BP_CX, 0, 0.72, 2.72, 0.14, rot=BP_ANGLE)),
    neck_pickup=r3([(np_cx, np_cy)]), control_plate=r3(stadium((cp_x0 + cp_x1) / 2, cp_y, cp_x1 - cp_x0, 1.24)),
    knobs=r3([(x, cp_y) for x in KNOB_X]), switch=[sw_x, cp_y],
    strings=[[[SADDLE_X[i // 2], round(Y_BRIDGE[i], 3)], [NUT_X0, round(Y_NUT[i], 3)]] for i in range(6)],
    gauges=GAUGE,
)
os.makedirs(os.path.join(ROOT, 'site', 'assets', 'data'), exist_ok=True)
json.dump(page, open(os.path.join(ROOT, 'site', 'assets', 'data', 'floe.json'), 'w'))
print('[floe] wrote page data')

os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'floe.blend'))

if '--no-export' not in ARGS:
    bpy.ops.object.select_all(action='DESELECT')
    rootob.select_set(True)
    for ob in G.values():
        ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_image_format='WEBP', export_image_quality=88,
                              export_materials='EXPORT', export_extras=False)
    print('[floe] wrote', OUT_GLB, os.path.getsize(OUT_GLB) // 1024, 'KB')

if '--render' in ARGS:
    exec(open(os.path.join(HERE, 'render_views.py')).read())
