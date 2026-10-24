"""KVELD house parts, shared by the six guitars built in session 5.

Floe was built first and on its own (build_floe.py). Everything here
generalises a piece of it, so the range shares one neck carve, one headstock
pair, one tuner, one knob, one switch tip, one strap button and one jack:

  body_shell     a body as a closed mesh: outline, a top and a back height
                 function (carves, bevels, arm and belly contours), rounded
                 edges, optional binding bands
  neck_loft      the neck, lofted from cross-sections (Floe's carve)
  fretboard      a separate board with a radius, optional binding
  frets, dots, nut
  head_six / head_three   the two KVELD headstocks; tuners on either
  string_paths, logo
  knob, toggle, blade, strap_button, edge_jack, neck_plate, screw
  pickups: single_coil, soapbar, humbucker (+ ring)
  bridges: vintage_trem, tune_o_matic, stopbar, jm_bridge, jm_vibrato, hardtail

Frame and units as in build_floe.py: inches in, metres out; X along the
strings (0 at the saddle line, + toward the headstock), Y across (+ bass),
Z up (0 the top of the body at its edge).
"""
import json, math, os

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from mathutils.geometry import delaunay_2d_cdt

import kveld_kit as K
from kveld_kit import (IN, principled, srgb, obj_from, merge, slab, lathe, place, tube, rounded_rect, stadium,
                       ellipse, transform_obj, catmull, prism_xz, ccw, vnormals, value_noise, fbm, save_png, normal_png, fill)

HERE = K.HERE
ROOT = K.ROOT
BRAND = 'KVELD'


def smoothstep(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


# =============================================================== materials ==
def house_materials():
    """The shared hardware, named as on Floe so the page treats them alike."""
    M = {}
    M['chrome'] = principled('Chrome', srgb((0.95, 0.95, 0.96)), 0.045, metal=1.0)
    M['nickel'] = principled('Nickel', srgb((0.88, 0.85, 0.78)), 0.11, metal=1.0)
    M['steel'] = principled('Steel_Plate', srgb((0.87, 0.87, 0.88)), 0.2, metal=1.0)
    M['brass'] = principled('Brass', srgb((0.89, 0.69, 0.41)), 0.16, metal=1.0)
    M['fret'] = principled('Fret_NickelSilver', srgb((0.86, 0.85, 0.81)), 0.09, metal=1.0)
    M['str_plain'] = principled('String_Plain', srgb((0.9, 0.89, 0.87)), 0.1, metal=1.0)
    M['str_wound'] = principled('String_Wound', srgb((0.76, 0.73, 0.68)), 0.3, metal=1.0)
    M['bone'] = principled('Bone', srgb((0.93, 0.89, 0.80)), 0.42)
    M['fibre'] = principled('Flatwork_Black', srgb((0.028, 0.025, 0.022)), 0.62)
    M['copper'] = principled('Coil_Copper', srgb((0.80, 0.44, 0.24)), 0.32, metal=1.0)
    M['pole'] = principled('Alnico', srgb((0.62, 0.62, 0.63)), 0.36, metal=1.0)
    M['plastic'] = principled('Plastic_Black', srgb((0.03, 0.03, 0.03)), 0.28)
    M['hole'] = principled('Hole_Dark', srgb((0.01, 0.01, 0.01)), 0.9)
    M['dot_pearl'] = principled('Dot_Pearl', srgb((0.90, 0.88, 0.82)), 0.22, coat=1.0, coat_rough=0.04)
    M['dot_black'] = principled('Dot_Black', srgb((0.02, 0.02, 0.02)), 0.35, coat=1.0, coat_rough=0.032)
    M['logo_black'] = principled('Logo_Black', srgb((0.015, 0.015, 0.015)), 0.25, coat=1.0, coat_rough=0.032)
    M['logo_bone'] = principled('Logo_Bone', srgb((0.90, 0.86, 0.76)), 0.3, coat=1.0, coat_rough=0.032)
    M['parchment'] = principled('Plastic_Parchment', srgb((0.86, 0.83, 0.75)), 0.3, coat=0.6, coat_rough=0.08)
    M['binding'] = principled('Binding_Cream', srgb((0.88, 0.83, 0.70)), 0.3, coat=1.0, coat_rough=0.03)
    return M


# ================================================================ textures ==
def rosewood_png(path, u0, us, w=2048, h=1024, vs=3.2, seed=21):
    """Indian rosewood fretboard, oiled: dark streaks along the board and open pores."""
    rng = np.random.default_rng(seed)
    u = u0 + (np.arange(w) + 0.5) / w * us
    v = (np.arange(h) + 0.5) / h * vs - vs / 2
    U, V = np.meshgrid(u, v)
    warp = fbm(h, w, 3, 10, rng) - 0.5
    t = V * 7 + warp * 0.45 + 0.6 * (fbm(h, w, 12, 3, rng) - 0.5)
    streak = 0.5 + 0.5 * np.sin(t * 2 * math.pi + 2.2 * (fbm(h, w, 24, 6, rng) - 0.5))
    mott = fbm(h, w, 5, 14, rng) - 0.5
    pores = value_noise(h, w, 420, 160, rng)
    pore = np.clip((pores - 0.86) / 0.06, 0, 1)
    base = np.array((0.150, 0.080, 0.047))
    dark = np.array((0.052, 0.028, 0.019))
    light = np.array((0.230, 0.128, 0.072))
    fine = 0.5 + 0.5 * np.sin((V * 31 + warp * 1.4 + 3 * (fbm(h, w, 40, 8, rng) - 0.5)) * 2 * math.pi)
    k = np.clip(streak ** 2.6 * 0.7 + 0.18 * fine ** 3 + 0.25 * (mott + 0.5), 0, 1)[..., None]
    col = dark * k + base * (1 - k)
    col = col * (1 - 0.35 * pore[..., None]) + light * (0.18 * np.clip(-mott, 0, 1))[..., None]
    return save_png(col, path)


def mahogany_png(path, u0, us, w=2048, h=512, vs=3.2, seed=33, tint=None):
    """Mahogany for a set neck: straight ribbon stripe and long pores."""
    rng = np.random.default_rng(seed)
    U, V = np.meshgrid(u0 + (np.arange(w) + 0.5) / w * us, (np.arange(h) + 0.5) / h * vs)
    warp = fbm(h, w, 3, 8, rng) - 0.5
    rib = 0.5 + 0.5 * np.sin((V * 4.0 + warp * 1.5) * 2 * math.pi)
    pores = np.clip((value_noise(h, w, 300, 90, rng) - 0.84) / 0.08, 0, 1)
    mott = fbm(h, w, 4, 12, rng) - 0.5
    base = np.array((0.42, 0.20, 0.11)); dark = np.array((0.30, 0.13, 0.07))
    col = base * (1 - 0.35 * rib[..., None]) + dark * 0.35 * rib[..., None]
    col *= (1 + 0.08 * mott)[..., None]
    col *= 1 - 0.28 * pores[..., None]
    if tint is not None:
        col = col * np.array(tint)
    return save_png(col, path)


# =============================================================== the body ===
def _dist_to_poly(px, py, poly):
    """Distance from points (arrays) to a closed polyline."""
    P = np.asarray(poly, float); A = P; B = np.roll(P, -1, axis=0)
    d = np.full(px.shape, 1e9)
    for (ax, ay), (bx, by) in zip(A, B):
        ex, ey = bx - ax, by - ay
        L2 = ex * ex + ey * ey or 1e-12
        t = np.clip(((px - ax) * ex + (py - ay) * ey) / L2, 0, 1)
        d = np.minimum(d, np.hypot(px - ax - t * ex, py - ay - t * ey))
    return d


def inside(px, py, poly):
    """Even-odd point in polygon, vectorised."""
    P = np.asarray(poly, float); res = np.zeros(px.shape, bool)
    xj, yj = P[-1]
    for xi, yi in P:
        c = ((yi > py) != (yj > py)) & (px < (xj - xi) * (py - yi) / ((yj - yi) if yj != yi else 1e-12) + xi)
        res ^= c
        xj, yj = xi, yi
    return res


class Edge:
    """Distance-to-edge lookups for one outline (used by carves and contours)."""
    def __init__(self, outline):
        self.poly = ccw(list(outline))

    def dist(self, x, y):
        return float(_dist_to_poly(np.array([x]), np.array([y]), self.poly)[0])


def cap_mesh(ring2d, holes2d, grid, margin, z_fn, rings=0.0):
    """CDT of a closed ring (plus holes) with interior grid points.
    rings: to this depth in from the ring, points are laid in rows parallel
    to it instead of on the grid, so a bevel or carve that follows the rim is
    meshed along its own lines (a grid cut across it at an angle and showed a
    fine sawtooth in reflections).
    Returns (points2d, z, tris) where the first len(ring2d) points are the ring."""
    ring2d = [tuple(p) for p in ring2d]
    pts = list(ring2d)
    faces = [list(range(len(ring2d)))]
    hole_polys = []
    for h in holes2d:
        base = len(pts); pts += [tuple(p) for p in h]
        hole_polys.append(h)
    xs = [p[0] for p in ring2d]; ys = [p[1] for p in ring2d]
    gx = np.arange(min(xs) + grid / 2, max(xs), grid)
    gy = np.arange(min(ys) + grid / 2, max(ys), grid)
    GX, GY = np.meshgrid(gx, gy)
    GX = GX.ravel(); GY = GY.ravel()
    # stagger every other row: triangles closer to equilateral
    GX = GX + ((np.round((GY - gy[0]) / grid) % 2) * grid * 0.5)
    ok = inside(GX, GY, ring2d) & (_dist_to_poly(GX, GY, ring2d) > margin + rings)
    for h in hole_polys:
        ok &= ~inside(GX, GY, h) & (_dist_to_poly(GX, GY, h) > margin)
    n_fixed = len(pts)
    if rings > 0:
        R0 = ccw(list(ring2d)); NR = vnormals(R0)
        taken = {}

        def free(x, y):
            i, j = int(x // (grid * 0.6)), int(y // (grid * 0.6))
            return all(math.hypot(x - a, y - b) > grid * 0.6
                       for di in (-1, 0, 1) for dj in (-1, 0, 1) for a, b in taken.get((i + di, j + dj), ()))
        d = grid
        while d <= rings + 1e-6:
            row = resample_poly([(p_[0] - q[0] * d, p_[1] - q[1] * d) for p_, q in zip(R0, NR)], grid)
            ax = np.array([p_[0] for p_ in row]); ay = np.array([p_[1] for p_ in row])
            dd = _dist_to_poly(ax, ay, ring2d)
            good = inside(ax, ay, ring2d) & (dd > d * 0.85) & (dd < d * 1.15)
            for h in hole_polys:
                good &= ~inside(ax, ay, h) & (_dist_to_poly(ax, ay, h) > margin)
            for x, y, g_ in zip(ax.tolist(), ay.tolist(), good.tolist()):
                if g_ and free(x, y):
                    pts.append((x, y)); taken.setdefault((int(x // (grid * 0.6)), int(y // (grid * 0.6))), []).append((x, y))
            d += grid
    pts += list(zip(GX[ok].tolist(), GY[ok].tolist()))
    vin = [Vector(p) for p in pts]
    edges = []
    for loop_start, loop in [(0, ring2d)] + [(None, h) for h in holes2d]:
        pass
    # holes as constraint edges
    k = len(ring2d)
    for h in holes2d:
        n = len(h)
        edges += [(k + i, k + (i + 1) % n) for i in range(n)]
        k += n
    out = delaunay_2d_cdt(vin, edges, faces, 1, 1e-7, True)
    overt, _, ofaces, orig_v = out[0], out[1], out[2], out[3]
    # map output verts to input indices (they should all be original)
    omap = []
    for i, ov in enumerate(orig_v):
        omap.append(ov[0] if ov else None)
    extra = {}
    tris = []
    for f in ofaces:
        idx = []
        for vi in f:
            j = omap[vi]
            if j is None:
                j = extra.setdefault(vi, len(pts) + len(extra))
            idx.append(j)
        tris.append(idx)
    allpts = pts + [tuple(overt[vi]) for vi, _ in sorted(extra.items(), key=lambda kv: kv[1])]
    # drop triangles inside holes
    if holes2d:
        cx = np.array([sum(allpts[i][0] for i in t) / 3 for t in tris]); cy = np.array([sum(allpts[i][1] for i in t) / 3 for t in tris])
        keep = np.ones(len(tris), bool)
        for h in holes2d:
            keep &= ~inside(cx, cy, h)
        tris = [t for t, k_ in zip(tris, keep) if k_]
    # orient CCW
    out_t = []
    for t in tris:
        a, b, c = [allpts[i] for i in t]
        if (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0:
            t = t[::-1]
        out_t.append(t)
    z = [z_fn(x, y) for x, y in allpts]
    return allpts, z, out_t


def body_shell(name, outline, top_fn, back_fn, mat, r_top=0.125, r_bot=0.125, steps=6, grid=0.16, r_fn=None,
               uv_origin=(0, 0), uv_size=16.5, smooth=50, rim_mat=None, bind=None, top_holes=(), back_mat=None, bind_back=True, grid_top=None, top_rings=0.0, back_rings=0.0, smooth_edge=0, follow_slope=False):
    """A guitar body as one closed mesh.

    outline       closed (x, y) loop, inches
    top_fn(x, y)  height of the top surface (0 on a flat top); back_fn likewise
    r_top, r_bot  edge radius; r_fn(p, i) -> scale (0..1) per outline point
    rim_mat       material for the side wall (default: mat)
    bind          (material, height): binding round the top and back edges,
                  over the roundover and `height` down the side
    top_holes     polygons cut through the top cap (f-holes)
    back_mat      material for the back cap (default: mat)
    """
    poly = ccw(list(outline))
    nrm = vnormals(poly)
    n = len(poly)
    verts, faces, fmat, fuv = [], [], [], []
    mlist = list(dict.fromkeys([m for m in (mat, rim_mat, bind[0] if bind else None, back_mat) if m is not None]))
    mid = {m.name: i for i, m in enumerate(mlist)}
    M_RIM = rim_mat or mat
    M_BIND = bind[0] if bind else None
    BH = bind[1] if bind else 0.0

    def puv(x, y):
        return ((x - uv_origin[0]) / uv_size, (y - uv_origin[1]) / uv_size)

    rs = [r_fn(poly[i], i) if r_fn else 1.0 for i in range(n)]
    # edge heights measured at the inset point where the roundover meets the top
    top_e = [top_fn(poly[i][0] - nrm[i][0] * r_top * rs[i], poly[i][1] - nrm[i][1] * r_top * rs[i]) for i in range(n)]
    bot_e = [back_fn(poly[i][0] - nrm[i][0] * r_bot * rs[i], poly[i][1] - nrm[i][1] * r_bot * rs[i]) for i in range(n)]
    # never let the two roundovers meet: shrink the radius where the edge is thin
    for i in range(n):
        t = top_e[i] - bot_e[i]
        if (r_top + r_bot) * rs[i] > 0.8 * t:
            rs[i] = 0.8 * t / (r_top + r_bot)
            top_e[i] = top_fn(poly[i][0] - nrm[i][0] * r_top * rs[i], poly[i][1] - nrm[i][1] * r_top * rs[i])
            bot_e[i] = back_fn(poly[i][0] - nrm[i][0] * r_bot * rs[i], poly[i][1] - nrm[i][1] * r_bot * rs[i])

    def centres(i):
        """follow_slope: how far short of a quarter turn the roundover stops, top
        and bottom, so it ends tangent to a cap that slopes at the rim (a contour),
        and the height of each arc's centre. A quarter circle ending level
        left a crease against a sloping contour."""
        p, q = poly[i], nrm[i]
        out = []
        for fn, r0, sgn in ((top_fn, r_top, 1.0), (back_fn, r_bot, -1.0)):
            r = r0 * rs[i]; al = 0.0
            for _ in range(3):
                d = r * (1 - math.sin(al))
                e = 0.03
                sl = (fn(p[0] - q[0] * (d + e), p[1] - q[1] * (d + e)) - fn(p[0] - q[0] * (d - e), p[1] - q[1] * (d - e))) / (2 * e)
                al = min(max(math.atan(sgn * sl), 0.0), math.radians(60))
            d = r * (1 - math.sin(al))
            out.append((al, fn(p[0] - q[0] * d, p[1] - q[1] * d) - sgn * r * math.cos(al)))
        return out

    if follow_slope:
        for i in range(n):
            for _ in range(14):
                (at_, zt_), (ab_, zb_) = centres(i)
                if zt_ - zb_ >= 0.04:
                    break
                rs[i] *= 0.85

    if smooth_edge:
        # where the edge is thin the radius was cut point by point, which left
        # the roundover dented ("crushed"): take the smallest radius nearby and
        # ease it along the rim instead
        a = np.array(rs)
        k = int(smooth_edge)
        pad = np.concatenate([a[-k:], a, a[:k]])
        # the smallest within 3k either side, then three k-wide averages: the
        # result can never rise above what any point's own thickness allows
        k3 = 3 * k
        pad = np.concatenate([a[-k3:], a, a[:k3]])
        a = np.array([pad[i:i + 2 * k3 + 1].min() for i in range(n)])
        for _ in range(3):
            pad = np.concatenate([a[-k:], a, a[:k]])
            a = np.convolve(pad, np.ones(2 * k + 1) / (2 * k + 1), mode='same')[k:-k]
        rs = [float(min(v, r0)) for v, r0 in zip(a, [r_fn(poly[i], i) if r_fn else 1.0 for i in range(n)])]
        top_e = [top_fn(poly[i][0] - nrm[i][0] * r_top * rs[i], poly[i][1] - nrm[i][1] * r_top * rs[i]) for i in range(n)]
        bot_e = [back_fn(poly[i][0] - nrm[i][0] * r_bot * rs[i], poly[i][1] - nrm[i][1] * r_bot * rs[i]) for i in range(n)]

    # Normals are set from the shape itself, not averaged from the faces: where
    # the flat cap meets the roundover, averaged normals shade the thin border
    # triangles in a sawtooth (Sam saw it on Sedge's edges).
    norms = []

    def grad_n(fn, x, y, up, e=0.02):
        dx = (fn(x + e, y) - fn(x - e, y)) / (2 * e); dy = (fn(x, y + e) - fn(x, y - e)) / (2 * e)
        v = Vector((-dx, -dy, 1.0)) if up else Vector((dx, dy, -1.0))
        return v.normalized()

    n_top = [grad_n(top_fn, poly[i][0] - nrm[i][0] * r_top * rs[i], poly[i][1] - nrm[i][1] * r_top * rs[i], True) for i in range(n)]
    n_bot = [grad_n(back_fn, poly[i][0] - nrm[i][0] * r_bot * rs[i], poly[i][1] - nrm[i][1] * r_bot * rs[i], False) for i in range(n)]

    if follow_slope:
        cc = [centres(i) for i in range(n)]
        a_t = [c[0][0] for c in cc]; zc_t = [c[0][1] for c in cc]
        a_b = [c[1][0] for c in cc]; zc_b = [c[1][1] for c in cc]
    else:
        a_t = [0.0] * n; a_b = [0.0] * n
        zc_t = [top_e[i] - r_top * rs[i] for i in range(n)]
        zc_b = [bot_e[i] + r_bot * rs[i] for i in range(n)]
    ZUP = Vector((0.0, 0.0, 1.0))

    if os.environ.get('DBG_RIM'):
        for i in range(0, n, 6):
            if poly[i][1] > 3.0 and -7 < poly[i][0] < 9:
                print('[rim] x %6.2f y %5.2f  top %.3f  back %.3f  thick %.3f  r %.2f  sweep t %.0f b %.0f' % (poly[i][0], poly[i][1], zc_t[i] + r_top * rs[i] * math.cos(a_t[i]),
                      zc_b[i] - r_bot * rs[i] * math.cos(a_b[i]), zc_t[i] - zc_b[i] + (r_top * math.cos(a_t[i]) + r_bot * math.cos(a_b[i])) * rs[i], rs[i], math.degrees(a_t[i]), math.degrees(a_b[i])))

    def ring_at(fn_xyz, fn_n):
        ring = []
        for i, (p, q) in enumerate(zip(poly, nrm)):
            verts.append(fn_xyz(i, p, q)); norms.append(fn_n(i, q)); ring.append(len(verts) - 1)
        return ring

    side_n = lambda i, q: Vector((q[0], q[1], 0.0))

    seq, kinds = [], []                 # rings top to bottom, and the kind of band below each
    for k in range(steps + 1):          # top roundover, top face down to the side
        fk = 1 - k / steps
        def f(i, p, q, fk=fk):
            phi = (math.pi / 2 - a_t[i]) * fk
            r = r_top * rs[i]; d = r - r * math.cos(phi)
            return (p[0] - q[0] * d, p[1] - q[1] * d, zc_t[i] + r * math.sin(phi))
        def fn(i, q, fk=fk):
            phi = (math.pi / 2 - a_t[i]) * fk
            if follow_slope:
                return (Vector((q[0], q[1], 0.0)) * math.cos(phi) + ZUP * math.sin(phi)).normalized()
            return (Vector((q[0], q[1], 0.0)) * math.cos(phi) + n_top[i] * math.sin(phi)).normalized()
        seq.append(ring_at(f, fn)); kinds.append('bind' if bind else 'round')
    kinds[-1] = 'side'
    if bind:
        seq.append(ring_at(lambda i, p, q: (p[0], p[1], zc_t[i] - BH), side_n))
        kinds[-2] = 'bind'; kinds.append('side')
        seq.append(ring_at(lambda i, p, q: (p[0], p[1], zc_b[i] + BH), side_n))
        kinds.append('bind' if bind_back else 'side')
    for k in range(steps + 1):          # bottom roundover, side down to the back face
        fk = k / steps
        def f(i, p, q, fk=fk):
            phi = -(math.pi / 2 - a_b[i]) * fk
            r = r_bot * rs[i]; d = r - r * math.cos(phi)
            return (p[0] - q[0] * d, p[1] - q[1] * d, zc_b[i] + r * math.sin(phi))
        def fn(i, q, fk=fk):
            phi = -(math.pi / 2 - a_b[i]) * fk
            if follow_slope:
                return (Vector((q[0], q[1], 0.0)) * math.cos(phi) + ZUP * math.sin(phi)).normalized()
            return (Vector((q[0], q[1], 0.0)) * math.cos(phi) + n_bot[i] * math.sin(-phi)).normalized()
        seq.append(ring_at(f, fn)); kinds.append('bind' if bind and bind_back else 'round')
    per = [0.0]
    for i in range(1, n + 1):
        per.append(per[-1] + math.dist(poly[i - 1], poly[i % n]))
    for si, (a_ring, b_ring) in enumerate(zip(seq, seq[1:])):
        kind = kinds[si]
        m = M_BIND if kind == 'bind' else (M_RIM if kind == 'side' else mat)
        for i in range(n):
            j = (i + 1) % n
            f_ = [a_ring[i], b_ring[i], b_ring[j], a_ring[j]]
            faces.append(f_); fmat.append(mid[m.name])
            if kind in ('side', 'bind'):
                za = verts[a_ring[i]][2]; zb = verts[b_ring[i]][2]
                ui, uj = per[i] / uv_size, per[i + 1] / uv_size
                fuv.append([(ui, 0.6 + za / uv_size), (ui, 0.6 + zb / uv_size), (uj, 0.6 + zb / uv_size), (uj, 0.6 + za / uv_size)])
            else:
                fuv.append([puv(*verts[v][:2]) for v in f_])
    # top and back caps
    for ring, fn, up, holes in ((seq[0], top_fn, True, top_holes), (seq[-1], back_fn, False, ())):
        ring2d = [verts[v][:2] for v in ring]
        g = (grid_top or grid) if up else grid
        pts, zs, tris = cap_mesh(ring2d, [list(h) for h in holes], g, g * 0.45, fn, rings=top_rings if up else back_rings)
        index = list(ring)
        for k in range(len(ring2d), len(pts)):
            verts.append((pts[k][0], pts[k][1], zs[k]))
            norms.append(grad_n(fn, pts[k][0], pts[k][1], up))
            index.append(len(verts) - 1)
        cm = mid[mat.name] if up else mid[(back_mat or mat).name]
        for t in tris:
            f_ = [index[i] for i in t]
            if not up:
                f_ = f_[::-1]
            faces.append(f_); fmat.append(cm); fuv.append([puv(*verts[v][:2]) for v in f_])
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x * IN, y * IN, z * IN) for x, y, z in verts], [], faces)
    layer = me.uv_layers.new(name='UVMap')
    layer.data.foreach_set('uv', [c for f_ in fuv for uv in f_ for c in uv])
    for m in mlist:
        me.materials.append(m)
    me.polygons.foreach_set('material_index', fmat)
    me.validate(clean_customdata=False)
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    if len(me.vertices) == len(norms):
        me.normals_split_custom_set_from_vertices([tuple(v) for v in norms])
    else:
        me.set_sharp_from_angle(angle=math.radians(smooth))
    ob = bpy.data.objects.new(name, me)
    K.root_col.objects.link(ob)
    return ob


def contour_fn(edge, line_pts, depth, power=1.8, side=1, taper=0.22):
    """A comfort contour falling away from a boundary line toward the edge.

    line_pts  the boundary (polyline) where the surface starts to fall
    side      which side of the line falls: +1 is the left of its direction
    depth     how far it has fallen at the body's edge
    Returns f(x, y) -> drop (>= 0)."""
    L = [np.array(p, float) for p in line_pts]
    seg = list(zip(L, L[1:]))
    total = sum(np.linalg.norm(b - a) for a, b in seg)

    def f(x, y):
        p = np.array((x, y))
        best = (1e9, 0, 0.0)
        acc = 0.0
        for a, b in seg:
            e = b - a; l2 = float(e @ e)
            t = min(max(float((p - a) @ e) / l2, 0.0), 1.0)
            q = a + t * e
            d = float(np.linalg.norm(p - q))
            s = side * (e[0] * (p - a)[1] - e[1] * (p - a)[0])
            if d < best[0]:
                best = (d, s, (acc + t * math.sqrt(l2)) / total)
            acc += math.sqrt(l2)
        d, s, u = best
        if s <= 0:
            return 0.0
        de = edge.dist(x, y)
        t = d / (d + de + 1e-9)
        tp = smoothstep(0, taper, u) * smoothstep(1, 1 - taper, u)
        return depth * tp * t ** power
    return f


def reshape_horn(outline, tip, pull, radius=2.2, round_r=0.9, rounds=12, axis=(-1.0, 0.0)):
    """Shorten a horn: pull the points near `tip` back along `axis`, then
    soften the tip by relaxing the points within round_r of it."""
    P = [list(p) for p in outline]
    ax = np.array(axis, float); ax /= np.linalg.norm(ax)
    for p in P:
        d = math.dist(p, tip)
        w = math.exp(-(d / radius) ** 2)
        p[0] += ax[0] * pull * w; p[1] += ax[1] * pull * w
    n = len(P)
    new_tip = (tip[0] + ax[0] * pull, tip[1] + ax[1] * pull)
    wts = [max(0.0, 1 - math.dist(p, new_tip) / round_r) ** 1.5 for p in P]
    for _ in range(rounds):
        Q = [p[:] for p in P]
        for i in range(n):
            if wts[i] <= 0:
                continue
            a, b = P[i - 1], P[(i + 1) % n]
            Q[i][0] = P[i][0] + 0.5 * wts[i] * ((a[0] + b[0]) / 2 - P[i][0])
            Q[i][1] = P[i][1] + 0.5 * wts[i] * ((a[1] + b[1]) / 2 - P[i][1])
        P = Q
    return [tuple(p) for p in P]


def departure(new, old):
    """For each point of `new`, how far it sits from the `old` outline (inches)."""
    d = _dist_to_poly(np.array([p[0] for p in new]), np.array([p[1] for p in new]), old)
    return d


# =========================================================== neck and board ==
class NeckSpec:
    """What the loft needs to know, as functions of the station x.

    width(x) -> (yl, yr)      the neck's plan edges (board edges under the nut)
    top(x)   -> z             top of the neck at the centreline
    back(x)  -> z             back of the neck at the centreline
    carve(x) -> n             superellipse exponent of the back (2.35 a soft C,
                              9 nearly square at the heel and the headstock)
    sag(x)   -> 0..1          how much of the board radius the top follows
    rs(x)    -> r             radius of the top corners
    """
    def __init__(self, **kw):
        self.__dict__.update(kw)


def neck_section(S, x):
    yl, yr = S.width(x)
    top, back, n, sag = S.top(x), S.back(x), S.carve(x), S.sag(x)
    R = S.radius
    width = yr - yl
    rs = min(S.rs(x), width / 2.2)
    zl = top - sag * (R - math.sqrt(R * R - yl * yl))
    zr = top - sag * (R - math.sqrt(R * R - yr * yr))
    pts = []
    NT = 22
    for k in range(NT + 1):
        y = (yl + rs) + (yr - yl - 2 * rs) * k / NT
        pts.append((y, top - sag * (R - math.sqrt(R * R - y * y))))
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
    NB = getattr(S, 'nb', 44)
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


def loft(name, stations, section, mat, u0, us, vs, smooth=60, caps=(True, True), transform=None):
    """Loft closed cross-sections (y, z) taken at each x station."""
    verts, faces, fuv = [], [], []
    FUV = []
    ring_n = None
    for x in stations:
        pts = section(x)
        ring_n = len(pts)
        cum = [0]
        for p, q in zip(pts, pts[1:] + pts[:1]):
            cum.append(cum[-1] + math.dist(p, q))
        for (y, z) in pts:
            verts.append((x, y, z))
        FUV.append([((x - u0) / us, c / vs) for c in cum])
    for s in range(len(stations) - 1):
        for k in range(ring_n):
            k2 = (k + 1) % ring_n
            a, b, c, d = s * ring_n + k, s * ring_n + k2, (s + 1) * ring_n + k2, (s + 1) * ring_n + k
            faces.append([a, d, c, b])
            fuv.append([FUV[s][k], FUV[s + 1][k], FUV[s + 1][k + 1], FUV[s][k + 1]])
    for s, flip, on in ((0, True, caps[0]), (len(stations) - 1, False, caps[1])):
        if not on:
            continue
        base = len(verts)
        ring = verts[s * ring_n:(s + 1) * ring_n]
        verts += ring
        f = list(range(base, base + ring_n))
        faces.append(f[::-1] if flip else f)
        fuv.append([((v[1] + 2) / us, (v[2] + 2) / vs) for v in ring][::-1 if flip else 1])
    if transform:
        verts = [transform(v) for v in verts]
    return obj_from(name, verts, faces, mat, uvs=fuv, smooth_angle=smooth)


def stations_between(x0, x1, fine=()):
    """Station list from x0 to x1: 0.12 apart, 0.02-0.04 inside the `fine` spans."""
    out = []
    x = x0
    while x < x1 - 1e-6:
        out.append(x)
        step = 0.12
        for a, b, s in fine:
            if a <= x <= b:
                step = min(step, s)
        x += step
    out.append(x1)
    return out


def board_section(W, R, ztop, zbot, x, bind=0.0, rs=0.03, nt=26):
    """Fretboard cross-section: radiused top, square sides, flat bottom.
    Returns the points and, for each edge k -> k+1, its kind
    ('top', 'edge' for the rounded corner/binding strip, 'side', 'bottom')."""
    yl, yr = W(x)
    bw = max(bind, rs + 0.03)
    zt = lambda y: ztop - (R - math.sqrt(R * R - y * y))
    pts = [(yl, zbot), (yl, zt(yl) - rs)]
    for k in range(1, 4):                                   # left corner
        a = math.pi - math.pi / 2 * k / 4
        pts.append((yl + rs + rs * math.cos(a), zt(yl + rs) - rs + rs * math.sin(a)))
    pts.append((yl + rs, zt(yl + rs)))
    pts.append((yl + bw, zt(yl + bw)))
    for k in range(1, nt):
        y = (yl + bw) + (yr - yl - 2 * bw) * k / nt
        pts.append((y, zt(y)))
    pts.append((yr - bw, zt(yr - bw)))
    pts.append((yr - rs, zt(yr - rs)))
    for k in range(1, 4):                                   # right corner
        a = math.pi / 2 - math.pi / 2 * k / 4
        pts.append((yr - rs + rs * math.cos(a), zt(yr - rs) - rs + rs * math.sin(a)))
    pts.append((yr, zt(yr) - rs))
    pts.append((yr, zbot))
    kinds = []
    for k in range(len(pts)):
        p, q = pts[k], pts[(k + 1) % len(pts)]
        if abs(p[1] - zbot) < 1e-9 and abs(q[1] - zbot) < 1e-9:
            kinds.append('bottom')
        elif abs(p[0] - q[0]) < 1e-9:
            kinds.append('side')
        elif min(p[0], q[0]) >= yr - bw - 1e-9 or max(p[0], q[0]) <= yl + bw + 1e-9:
            kinds.append('edge')
        else:
            kinds.append('top')
    return pts, kinds


def fretboard(name, W, R, ztop, zbot, x0, x1, mat, bind_mat=None, bind=0.0, u0=0, us=26.4, vs=3.2, transform=None):
    """Separate board from x0 (body end) to x1 (nut). Planar UVs on the top."""
    stations = stations_between(x0, x1)
    verts, faces, fuv, fm = [], [], [], []
    rings = []
    kinds = None
    for x in stations:
        pts, kinds = board_section(W, R, ztop, zbot, x, bind=bind)
        rings.append(len(verts))
        verts += [(x, y, z) for y, z in pts]
    n = len(kinds)
    for s in range(len(stations) - 1):
        for k in range(n):
            k2 = (k + 1) % n
            a, b = rings[s] + k, rings[s] + k2
            c, d = rings[s + 1] + k2, rings[s + 1] + k
            faces.append([a, d, c, b])
            kind = kinds[k]
            if kind in ('side', 'bottom'):
                fuv.append([((verts[v][0] - u0) / us, 0.5 + verts[v][2] / vs) for v in (a, d, c, b)])
            else:
                fuv.append([((verts[v][0] - u0) / us, 0.5 + verts[v][1] / vs) for v in (a, d, c, b)])
            is_bind = bind > 0 and kind in ('side', 'edge')
            fm.append(1 if is_bind else 0)
    for s, flip in ((0, True), (len(stations) - 1, False)):
        f = list(range(rings[s], rings[s] + n))
        faces.append(f[::-1] if flip else f)
        fuv.append([(0.5 + verts[v][1] / vs, 0.5 + verts[v][2] / vs) for v in f][::-1 if flip else 1])
        fm.append(1 if bind > 0 else 0)
    if transform:
        verts = [transform(v) for v in verts]
    ob = obj_from(name, verts, faces, mat, uvs=fuv, smooth_angle=40)
    if bind_mat is not None and bind > 0:
        ob.data.materials.append(bind_mat)
        ob.data.polygons.foreach_set('material_index', fm)
    return ob


def frets(name, positions, W, R, ztop, mat, inset=0.018, fret_w=0.078, fret_h=0.043, transform=None):
    """Nickel silver fret wire with a crowned top and bevelled ends."""
    fv, ff = [], []
    for fx in positions:
        yl, yr = W(fx)
        yl += inset; yr -= inset
        NY, NC = 40, 12
        base = len(fv)
        for i in range(NY + 1):
            y = yl + (yr - yl) * i / NY
            endd = min(y - yl, yr - y)
            hk = min(1.0, 0.25 + endd / 0.07)
            zb = ztop - (R - math.sqrt(R * R - y * y)) - 0.004
            for j in range(NC + 1):
                a = math.pi * j / NC
                fv.append((fx - math.cos(a) * fret_w / 2, y, zb + 0.004 + math.sin(a) ** 0.7 * fret_h * hk))
        for i in range(NY):
            for j in range(NC):
                a = base + i * (NC + 1) + j
                ff.append([a, a + 1, a + NC + 2, a + NC + 1])
        for i in (0, NY):
            ring = [base + i * (NC + 1) + j for j in range(NC + 1)]
            ff.append(ring if i == 0 else ring[::-1])
    if transform:
        fv = [transform(v) for v in fv]
    return obj_from(name, fv, ff, mat, smooth_angle=70)


def fret_positions(scale, n):
    return [scale * 2 ** (-k / 12) for k in range(1, n + 1)]


def marker_positions(scale, n):
    """KVELD markers: one dot between the frets at 3 5 7 9 15 17 19 21, two at 12 (and 24)."""
    F = [scale] + fret_positions(scale, n)
    out = []
    for k in (3, 5, 7, 9, 12, 15, 17, 19, 21, 24):
        if k > n:
            continue
        x = (F[k - 1] + F[k]) / 2
        if k in (12, 24):
            out += [(x, 0.42), (x, -0.42)]
        else:
            out.append((x, 0.0))
    return out


def dots(marks, R, ztop, mat, side_mat, side_y, side_z, r=0.125, transform=None, prefix='dot'):
    """Face dots (0.1 mm proud: flush ones flickered on Floe) and side dots on the bass edge."""
    out = []
    seen_x = set()
    for i, (x, y) in enumerate(marks):
        tilt = math.asin(y / R)
        d = lathe(f'{prefix}_{i}', [(0, 0.004), (r, 0.004), (r, -0.02), (0, -0.02)], mat, seg=36)
        place(d, (x, y, ztop - (R - math.sqrt(R * R - y * y))), axis=(0, math.sin(tilt), math.cos(tilt)))
        out.append(d)
        if round(x, 2) in seen_x:
            continue
        seen_x.add(round(x, 2))
        s = lathe(f's{prefix}_{i}', [(0, 0.004), (0.04, 0.004), (0.04, -0.02), (0, -0.02)], side_mat, seg=16)
        place(s, (x, side_y(x) + 0.0005, side_z(x)), axis=(0, 1, 0))
        out.append(s)
    if transform:
        for o in out:
            o.matrix_world = Matrix(transform) @ o.matrix_world
    return out


def nut(name, x0, x1, half, R, ztop, h_nut, zbot, mat, transform=None):
    """Bone nut across the board end, top following the radius."""
    v, f = [], []
    NN = 30
    for i in range(NN + 1):
        y = -half + 2 * half * i / NN
        zb = ztop - (R - math.sqrt(R * R - y * y))
        zt = zb + h_nut - 0.012
        for x, z in ((x0, zbot), (x0, zt), (x1, zt - 0.015), (x1, zbot)):
            v.append((x, y, z))
    for i in range(NN):
        for j in range(4):
            a = i * 4 + j; b = i * 4 + (j + 1) % 4
            f.append([a, b, b + 4, a + 4])
    f.append([0, 1, 2, 3][::-1]); f.append([NN * 4 + k for k in range(4)])
    if transform:
        v = [transform(p) for p in v]
    return obj_from(name, v, f, mat, smooth_angle=40, recalc=True)


# ============================================================== headstocks ==
# Six in line (bolt-ons), Floe's outline, measured from the fret-side face of the nut.
L_EDGE = lambda xh: 1.249 - 0.3053 * (xh - 1.826)
HS_SIX = ([(0.12, 0.826), (0.40, 0.85), (0.75, 0.98), (1.10, 1.21), (1.45, 1.355)]
          + [(xh, L_EDGE(xh)) for xh in (2.3, 3.2, 4.1, 5.0, 5.8)]
          + [(6.35, -0.13), (6.85, -0.27), (7.14, -0.45), (7.27, -0.68), (7.21, -0.92), (7.0, -1.075), (6.6, -1.145),
             (5.8, -1.14), (4.8, -1.06), (3.8, -1.005), (2.8, -1.0), (1.9, -1.005), (1.2, -0.975), (0.7, -0.905), (0.35, -0.85), (0.12, -0.826)])
# Floe's posts, from the Telecaster neck drawing: low E nearest the nut
SIX_POSTS = [(27.189 - 25.5, 0.8), (28.093 - 25.5, 0.524), (28.997 - 25.5, 0.248), (29.9 - 25.5, -0.029),
             (30.804 - 25.5, -0.305), (31.708 - 25.5, -0.581)]

# Three a side (set necks). KVELD's own: the sides flare in one long curve,
# and the tip is cut on the same slant as the six-in-line, so the two
# headstocks read as one family. Bass edge (+y) first, half-widths.
HS_THREE_BASS = [(0.0, 0.0), (0.25, 0.86), (0.55, 0.93), (1.0, 1.10), (1.6, 1.36), (2.4, 1.60), (3.3, 1.76), (4.2, 1.83),
                 (5.0, 1.82), (5.7, 1.74), (6.25, 1.58), (6.62, 1.38)]
HS_THREE_TIP = [(6.62, 1.38), (6.80, 1.05), (6.93, 0.5), (7.0, 0.0), (7.03, -0.5), (7.0, -1.0), (6.88, -1.38)]
HS_THREE_TREB = [(0.0, 0.0), (0.25, -0.86), (0.55, -0.93), (1.0, -1.10), (1.6, -1.36), (2.4, -1.60), (3.3, -1.76), (4.2, -1.84),
                 (5.0, -1.86), (5.7, -1.82), (6.25, -1.70), (6.6, -1.55), (6.88, -1.38)]
# bass then treble, from the nut; in far enough that each housing sits under the
# head (further out, they cut through its edge and left a dent)
THREE_POSTS = [(1.55, 0.98), (3.05, 1.14), (4.55, 1.20), (1.55, -0.98), (3.05, -1.14), (4.55, -1.20)]


def edge_fn(pts, x_off):
    xs = np.maximum.accumulate(np.array([x_off + p[0] for p in pts]))
    ys = np.array([p[1] for p in pts])
    return lambda x: float(np.interp(x, xs, ys))


def six_head_edges(nut_x0):
    hs = catmull(HS_SIX, per=16, closed=False)
    tip_i = max(range(len(hs)), key=lambda k: hs[k][0])
    bass, treb = hs[:tip_i + 1], hs[tip_i:][::-1]
    return edge_fn(bass, nut_x0), edge_fn(treb, nut_x0), hs[tip_i][0], bass, treb


def three_head_edges(nut_x0, half_nut):
    """Bass and treble edge functions of the 3+3 outline (in head-face length).

    The outline is one chain from the nut's bass corner round the slanted tip to
    its treble corner, split at its furthest point, so the two edges meet at the
    tip (split anywhere else and the loft ends in a flat cap). It starts at the
    nut's own width, so the neck runs into the head without a step."""
    bass = [(0.0, half_nut), (0.18, half_nut + 0.012)] + [(x, y) for x, y in HS_THREE_BASS[2:]]
    treb = [(0.0, -half_nut), (0.18, -half_nut - 0.012)] + [(x, y) for x, y in HS_THREE_TREB[2:]]
    chain = bass + HS_THREE_TIP[1:-1] + treb[::-1]
    pts = catmull(chain, per=14, closed=False)
    k = max(range(len(pts)), key=lambda i: pts[i][0])
    b_run = pts[:k + 1]
    t_run = pts[k:][::-1]
    return edge_fn(b_run, nut_x0), edge_fn(t_run, nut_x0), pts[k][0], b_run, t_run


# ================================================================== tuners ==
def tuner(i, px, py, side, back_z, M, frame=None, turn=0.0, offset=0.16, shaft0=None):
    """One KVELD tuner (Floe's): bushing and post on the face (z = 0 in the
    head frame), housing, shaft and key behind. side=+1 keys toward +y."""
    parts = []
    bush = lathe(f'bushing_{i}', [(0, 0.05), (0.13, 0.05), (0.165, 0.035), (0.17, 0.0), (0, 0.0)], M['nickel'], seg=28)
    parts.append(place(bush, (px, py, 0.0)))
    post = lathe(f'post_{i}', [(0, 0.47), (0.10, 0.47), (0.118, 0.455), (0.118, 0.0), (0, 0.0)], M['nickel'], seg=24)
    parts.append(place(post, (px, py, 0.0)))
    parts.append(slab(f'post_slot_{i}', rounded_rect(px, py, 0.03, 0.2, 0.012, rot=0.6), 0.4725, 0.4735, M['hole']))
    housing = slab(f'housing_{i}', rounded_rect(px, py + offset * side, 0.56, 0.78, 0.1), back_z - 0.36, back_z + 0.03, M['nickel'], r_bot=0.1, steps=4)
    parts.append(housing)
    s0 = 0.52 if shaft0 is None else shaft0                  # the shaft runs out from the housing's end
    shaft = lathe(f'shaft_{i}', [(0, 0), (0.06, 0), (0.06, 0.86 - s0), (0, 0.86 - s0)], M['nickel'], seg=12)
    parts.append(place(shaft, (px, py + s0 * side, back_z - 0.2), axis=(0, side, 0)))
    key = slab(f'key_{i}', ellipse(0, 0, 0.31, 0.24), -0.05, 0.05, M['nickel'], r_top=0.03, r_bot=0.03, steps=3)
    transform_obj(key, Matrix.Translation(Vector((px, py + 1.13 * side, back_z - 0.2)) * IN) @ Matrix.Rotation(turn, 4, 'Y')
                  @ Matrix(((0, -1, 0, 0), (1, 0, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1))))
    parts.append(key)
    if frame is not None:
        for o in parts:
            o.matrix_world = frame @ o.matrix_world
    return parts


# ================================================================= strings ==
GAUGE = [0.046, 0.036, 0.026, 0.017, 0.013, 0.010]
WOUND = [True, True, True, False, False, False]


def string_run(i, path, post_xy, post_r_face, wrap_z, M, frame=None, turns=None):
    """Tube along `path` (body frame, inches), leaving it tangent onto a post and
    winding a few turns down it. post_xy/wrap_z are in the head frame; frame maps
    head frame to body frame (inches)."""
    r = GAUGE[i] / 2
    px, py = post_xy
    post_r = post_r_face + r
    F = frame if frame is not None else Matrix.Identity(4)
    Fi = F.inverted()
    last = Fi @ Vector(path[-1])          # where the string comes from, in the head frame
    dxn, dyn = last.x - px, last.y - py
    ln = math.hypot(dxn, dyn); ux, uy = dxn / ln, dyn / ln
    # tangent point on the side the string wraps from (strings wind inward)
    sgn = 1 if py >= 0 else -1
    tx, ty = px - uy * post_r * sgn, py + ux * post_r * sgn
    pts = list(path) + [tuple(F @ Vector((tx, ty, wrap_z + r)))]
    turns = turns if turns is not None else (2.2 if WOUND[i] else 3.4)
    a0 = math.atan2(ty - py, tx - px)
    for s in range(1, 64):
        a = a0 + sgn * s / 63 * turns * 2 * math.pi
        pts.append(tuple(F @ Vector((px + post_r * math.cos(a), py + post_r * math.sin(a), wrap_z + r - s / 63 * (GAUGE[i] * 1.05 * turns)))))
    return tube(f'string_{i}', pts, r, M['str_wound'] if WOUND[i] else M['str_plain'], sides=10 if WOUND[i] else 8)


# ==================================================================== logo ==
def logo(text, size, spacing, M_logo, loc, rot=0.0, frame=None):
    font = bpy.data.fonts.load(os.path.join(HERE, 'fonts', 'Panchang-Medium.ttf'), check_existing=True)
    tc = bpy.data.curves.new('logo', 'FONT')
    tc.body = text
    tc.font = font
    tc.size = size * IN
    tc.space_character = spacing
    tc.align_x = 'CENTER'; tc.align_y = 'CENTER'
    tc.extrude = 0.0006 * IN
    to = bpy.data.objects.new('logo_text', tc)
    K.root_col.objects.link(to)
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(to.evaluated_get(deps))
    bpy.data.objects.remove(to)
    ob = bpy.data.objects.new('Logo', me)
    K.root_col.objects.link(ob)
    me.materials.clear(); me.materials.append(M_logo)
    me.transform(Matrix.Translation(Vector(loc) * IN) @ Matrix.Rotation(rot, 4, 'Z'))
    if frame is not None:
        me.transform(frame)
    return ob


# ================================================================ hardware ==
def screw(name, loc, M, axis=(0, 0, 1), d=0.19, h=0.045, mat=None):
    r = d / 2
    prof = [(0, h)] + [(r * math.sin(a), h * math.cos(a) * 0.9 + 0.0) for a in np.linspace(0.15, math.pi / 2, 6)] + [(r, 0), (r * 0.9, -0.01), (0, -0.01)]
    ob = lathe(name, prof, mat or M['chrome'], seg=20)
    return place(ob, loc, axis)


KNOB_PROFILE = [(0, 0.66), (0.10, 0.655), (0.22, 0.64), (0.31, 0.62), (0.355, 0.60), (0.37, 0.57), (0.37, 0.16), (0.36, 0.14), (0.30, 0.13),
                (0.14, 0.13), (0.14, 0.06), (0, 0.06)]


def knob(i, x, y, z, M, axis=(0, 0, 1), spin=0.0):
    """The house knob: knurled chrome dome, Floe's."""
    k = lathe(f'knob_{i}', KNOB_PROFILE, M['chrome'], seg=128, knurl=(0.155, 0.575, 64, 0.018), sharp=30)
    return place(k, (x, y, z), axis=axis, spin=spin)


def switch_tip(name, loc, M, axis=(0, 0, 1)):
    """The house switch tip (Floe's barrel), black."""
    tip = lathe(name, [(0, 0.35), (0.10, 0.35), (0.15, 0.33), (0.17, 0.28), (0.17, 0.06), (0.14, 0.02), (0.06, 0.0), (0, 0.0)], M['plastic'], seg=24)
    return place(tip, loc, axis=axis)


def blade_switch(x, y, z, M, angle=0.0, throw=0.0):
    """Blade selector through a plate: slot, lever, house tip.
    angle: the slot's direction in the plane (radians from +X)."""
    out = []
    c, s = math.cos(angle), math.sin(angle)
    slot = slab('blade_slot', stadium(0, 0, 0.78, 0.10), z, z + 0.001, M['hole'])
    transform_obj(slot, Matrix.Translation((x * IN, y * IN, 0)) @ Matrix.Rotation(angle, 4, 'Z'))
    out.append(slot)
    bx, by = x + c * throw, y + s * throw
    lean = 0.06
    top = (bx + c * lean, by + s * lean, z + 0.22)
    out.append(tube('blade_lever', [(bx, by, z - 0.04), top], 0.028, M['steel'], sides=10))
    out.append(switch_tip('blade_tip', (top[0], top[1], top[2] - 0.04), M, axis=(lean * c, lean * s, 0.26)))
    return out


def toggle_switch(x, y, z, M, axis=(0, 0, 1), lean=(0.0, 0.25)):
    """Three-way toggle: knurled nut and ring washer, a chrome lever, the house tip."""
    out = []
    ring = lathe('toggle_ring', [(0, 0.012), (0.55, 0.012), (0.6, 0.006), (0.6, 0.0), (0, 0.0)], M['chrome'], seg=64)
    out.append(place(ring, (x, y, z), axis))
    nutm = lathe('toggle_nut', [(0, 0.16), (0.2, 0.16), (0.21, 0.15), (0.21, 0.02), (0.2, 0.012), (0, 0.012)], M['chrome'], seg=48,
                 knurl=(0.03, 0.14, 36, 0.01))
    out.append(place(nutm, (x, y, z), axis))
    d = Vector((lean[0], lean[1], 1.0)).normalized()
    a = Vector(axis).normalized()
    q = Vector((0, 0, 1)).rotation_difference(a)
    d = q @ d
    base = Vector((x, y, z)) + a * 0.16
    lever = tube('toggle_lever', [tuple(base), tuple(base + d * 0.45)], 0.03, M['chrome'], sides=12)
    out.append(lever)
    tip = lathe('toggle_tip', [(0, 0.40), (0.08, 0.40), (0.13, 0.37), (0.15, 0.30), (0.12, 0.05), (0.06, 0.0), (0, 0.0)], M['plastic'], seg=24)
    out.append(place(tip, tuple(base + d * 0.38), axis=tuple(d)))
    return out


STRAP_PROFILE = [(0, 0.30), (0.14, 0.30), (0.24, 0.27), (0.26, 0.23), (0.24, 0.19), (0.12, 0.16), (0.10, 0.10), (0.10, 0.03), (0.22, 0.02), (0.22, 0.0), (0, 0.0)]


def strap_button(name, p, q, z, M):
    return place(lathe(name, STRAP_PROFILE, M['chrome'], seg=32), (p[0], p[1], z), axis=(q[0], q[1], 0))


def edge_jack(p, q, z, M):
    """The house side jack: Floe's chrome cup set into the rim."""
    out = []
    cup = lathe('jack_cup', [(0, -0.36), (0.20, -0.36), (0.34, -0.20), (0.40, -0.02), (0.46, 0.0), (0.46, 0.012), (0.40, 0.012), (0.34, -0.01),
                             (0.28, -0.18), (0.16, -0.30), (0, -0.30)], M['chrome'], seg=40)
    out.append(place(cup, (p[0], p[1], z), axis=(q[0], q[1], 0)))
    nj = lathe('jack_nut', [(0, -0.20), (0.18, -0.20), (0.18, -0.12), (0.10, -0.12), (0.10, -0.05), (0, -0.05)], M['nickel'], seg=6)
    out.append(place(nj, (p[0], p[1], z), axis=(q[0], q[1], 0)))
    hj = lathe('jack_hole', [(0, -0.1245), (0.075, -0.1245), (0.075, -0.124), (0, -0.124)], M['hole'], seg=16)
    out.append(place(hj, (p[0], p[1], z), axis=(q[0], q[1], 0)))
    return out


def neck_plate(x0, x1, screws_xy, z_back, M, w=2.52, h=2.02, engrave=True):
    """The house neck plate (Floe's), with its screws, on the back at z_back."""
    out = [slab('NeckPlate', rounded_rect((x0 + x1) / 2, 0, w, h, 0.22), z_back - 0.07, z_back, M['chrome'], r_bot=0.02, steps=3)]
    for i, (x, y) in enumerate(screws_xy):
        out.append(screw(f'plate_screw_{i}', (x, y, z_back - 0.07), M, axis=(0, 0, -1), d=0.2, h=0.05))
    return out


def outline_point(outline, target, direction=None):
    """Nearest outline point to target, with its outward normal."""
    o = ccw(list(outline)); nr = vnormals(o)
    i = min(range(len(o)), key=lambda k: math.dist(o[k], target))
    return o[i], nr[i], i


# ================================================================= pickups ==
def single_coil(tag, cx, cy, angle, ys_strings, z0, M, cover_mat, stagger=(0.03, 0.034, 0.042, 0.038, 0.03, 0.026)):
    """Strat-type single coil under a moulded cover, six alnico poles showing
    through it, two mounting screws at the ends. z0: the surface it sits on."""
    parts = []
    L, Wd, H = 3.28, 0.70, 0.36
    outline = stadium(0, 0, L, Wd, n=20)
    cov = slab(f'{tag}_cover', [(y, x) for x, y in outline], z0, z0 + H, cover_mat, r_top=0.09, steps=5)
    parts.append(cov)
    ca, sa = math.cos(angle), math.sin(angle)
    for i, ys in enumerate(ys_strings):
        # pole under string i, along the pickup's own axis
        px, ys = 0.0, (ys - cy) / math.cos(angle)
        hole = lathe(f'{tag}_ph_{i}', [(0, 0.001), (0.105, 0.001), (0.105, 0.0), (0, 0.0)], M['hole'], seg=20)
        parts.append(place(hole, (px, ys, z0 + H + 0.0005)))
        pole = lathe(f'{tag}_pole_{i}', [(0, stagger[i] - 0.02), (0.085, stagger[i] - 0.02), (0.094, stagger[i] - 0.03), (0.094, -0.1), (0, -0.1)],
                     M['pole'], seg=18)
        parts.append(place(pole, (px, ys, z0 + H)))
    for s in (-1, 1):
        parts.append(screw(f'{tag}_screw_{s}', (0, s * (L / 2 + 0.19), z0), M, d=0.17, h=0.04))
    for o in parts:
        o.matrix_world = Matrix.Translation(Vector((cx, cy, 0)) * IN) @ Matrix.Rotation(angle, 4, 'Z') @ o.matrix_world
    return parts


# ================================================================= bridges ==
def bent_saddle(i, xc, zc, y, w, T, x0, M, length=0.92, rn=0.10, th=0.045):
    """A pressed-steel vintage saddle: a thin bent plate riding on two height
    screws. Rounded nose at the crest, a top falling gently to the back, a
    flange bent down at the rear where the intonation screw and spring sit."""
    tilt = 0.06                                # the top falls this much toward the back
    xr = xc - length
    outer = []
    for k in range(9):                         # nose: from below the front up over the crest
        a = -0.35 * math.pi + (0.85 * math.pi) * k / 8
        outer.append((xc + rn * math.cos(a) - rn * 0.0, zc - rn + rn * math.sin(a)))
    outer = [(x - rn * 0.0, z) for x, z in outer]
    outer.append((xr + 0.06, zc - tilt))      # top, falling back
    for k in range(1, 5):                      # rear bend
        a = math.pi / 2 + math.pi / 2 * k / 4
        outer.append((xr + 0.06 + 0.06 * math.cos(a), zc - tilt - 0.06 + 0.06 * math.sin(a)))
    zf = max(T + 0.035, zc - tilt - 0.21)     # the flange stops short: the saddle rides on its screws
    outer.append((xr, zf))                     # flange down toward the plate
    inner = []
    inner.append((xr + th, zf))
    for k in range(4, 0, -1):
        a = math.pi / 2 + math.pi / 2 * k / 4
        inner.append((xr + 0.06 + (0.06 - th) * math.cos(a), zc - tilt - 0.06 + (0.06 - th) * math.sin(a)))
    inner.append((xr + 0.06, zc - tilt - th))
    for k in range(8, -1, -1):
        a = -0.35 * math.pi + (0.85 * math.pi) * k / 8
        inner.append((xc + (rn - th) * math.cos(a), zc - rn + (rn - th) * math.sin(a)))
    prof = outer + inner
    sad = prism_xz(f'saddle_{i}', prof, y - w / 2, y + w / 2, M['steel'])
    extra = []
    zt = zc - tilt * 0.4 - th
    for dy in (-0.105, 0.105):
        hs = lathe(f'hscrew_{i}_{dy}', [(0, zt - T + 0.035), (0.042, zt - T + 0.035), (0.042, 0.0), (0, 0.0)], M['steel'], seg=12)
        extra.append(place(hs, (xc - 0.40, y + dy, T)))
        sock = lathe(f'hsock_{i}_{dy}', [(0, 0.0012), (0.022, 0.0012), (0.022, 0.0), (0, 0.0)], M['hole'], seg=6)
        extra.append(place(sock, (xc - 0.40, y + dy, zt + 0.035)))
    zi = zf + 0.065
    ln = (xr + 0.08) - x0
    isc = lathe(f'iscrew_{i}', [(0, 0), (0.07, 0), (0.07, 0.045), (0.03, 0.045), (0.03, ln + 0.05), (0, ln + 0.05)], M['chrome'], seg=12)
    extra.append(place(isc, (x0 - 0.045, y, zi), axis=(1, 0, 0)))
    spring = []
    L_sp = xr - (x0 + 0.07)
    for s in range(80):
        a = s / 80 * 2 * math.pi * 6
        spring.append((x0 + 0.07 + L_sp * s / 79, y + 0.06 * math.cos(a), zi + 0.06 * math.sin(a)))
    extra.append(tube(f'spring_{i}', spring, 0.011, M['steel'], sides=6))
    return sad, extra


def vintage_trem(xf, ys_strings, crest, M, plate_w=2.86, depth=1.73, arm_dir=(-0.85, -0.62)):
    """Six-screw vintage tremolo: chrome plate, bent steel saddles with height
    and intonation screws and springs, six pivot screws, the arm.
    xf: the plate's front edge; crest[i] = (x, z) of each saddle's crest."""
    parts = []
    T = 0.07
    x0 = xf - depth
    plate = slab('trem_plate', rounded_rect((x0 + xf) / 2, 0, depth, plate_w, 0.08), 0.0, T, M['chrome'], r_top=0.015, steps=2)
    parts.append(plate)
    wall = prism_xz('trem_wall', [(x0, T), (x0 + 0.06, T), (x0 + 0.06, 0.40), (x0, 0.40)], -plate_w / 2 + 0.06, plate_w / 2 - 0.06, M['chrome'])
    parts.append(wall)
    for i, y in enumerate([1.11 - k * 0.444 for k in range(6)]):
        parts.append(screw(f'pivot_{i}', (xf - 0.13, y, T), M, d=0.2, h=0.05))
    saddles = []
    for i, y in enumerate(ys_strings):
        xc, zc = crest[i]
        w = 0.40
        sad, extra = bent_saddle(i, xc, zc, y, w, T, x0, M)
        saddles += [sad] + extra
    # the arm: up out of the block at the treble rear corner, then out over the body
    ax, ay = x0 + 0.45, -plate_w / 2 + 0.32
    d = Vector((arm_dir[0], arm_dir[1], 0.0)).normalized()
    p0 = Vector((ax, ay, T))
    path = [p0, p0 + Vector((0, 0, 0.30))]
    for k in range(1, 9):
        a = math.pi / 2 * k / 8
        path.append(p0 + Vector((0, 0, 0.30)) + (d * (1 - math.cos(a)) + Vector((0, 0, math.sin(a)))) * 0.16)
    end = path[-1]
    for k in range(1, 12):
        t = k / 11
        path.append(end + d * 3.6 * t + Vector((0, 0, 0.42 * t * t)))
    parts.append(tube('trem_arm', [tuple(p) for p in path], 0.095, M['steel'], sides=16))
    tipd = (path[-1] - path[-2]).normalized()
    tip = lathe('trem_tip', [(0, 0.9), (0.06, 0.895), (0.11, 0.87), (0.135, 0.82), (0.135, 0.05), (0.11, 0.0), (0, 0.0)], M['parchment'], seg=24)
    parts.append(place(tip, tuple(path[-1] - tipd * 0.05), axis=tuple(tipd)))
    return parts, saddles


# ===================================================================== export ==
def assemble(prefix, groups, tail_x, body_mid_z):
    """Parent the named groups under one root and stand the guitar upright:
    tail at the origin, +Y up the neck, front toward +Z (glTF)."""
    rootob = bpy.data.objects.new(f'KVELD_{prefix}', None)
    K.root_col.objects.link(rootob)
    upright = Matrix(((0, -1, 0, 0), (0, 0, -1, 0), (1, 0, 0, 0), (0, 0, 0, 1)))
    for ob in groups.values():
        ob.parent = rootob
    rootob.matrix_world = upright @ Matrix.Translation(Vector((-tail_x, 0, -body_mid_z)) * IN)
    bpy.context.view_layer.update()
    return rootob


def export(rootob, groups, out_glb, blend_path):
    os.makedirs(os.path.dirname(out_glb), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.ops.object.select_all(action='DESELECT')
    rootob.select_set(True)
    for ob in groups.values():
        ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_image_format='WEBP', export_image_quality=88,
                              export_materials='EXPORT', export_extras=False,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                              export_draco_position_quantization=16, export_draco_normal_quantization=12,
                              export_draco_texcoord_quantization=14)
    print('[kit] wrote', out_glb, os.path.getsize(out_glb) // 1024, 'KB')


def r3(pts):
    return [[round(a, 3), round(b, 3)] for a, b in pts]


# ================================================= Jazzmaster-type hardware ==
def tortoise_png(path, origin, size, n=2048, seed=5):
    """Tortoiseshell celluloid: amber ground, dark brown clouds, red flecks."""
    rng = np.random.default_rng(seed)
    a = fbm(n, n, 22, 30, rng, octaves=5)
    b = fbm(n, n, 60, 80, rng, octaves=3)
    w = fbm(n, n, 6, 8, rng) - 0.5
    t = np.clip((a + 0.3 * b + 0.35 * w - 0.40) / 0.30, 0, 1)
    t = t ** 0.8
    amber = np.array((0.26, 0.105, 0.035)); dark = np.array((0.03, 0.012, 0.007)); red = np.array((0.20, 0.05, 0.015))
    fleck = np.clip((value_noise(n, n, 160, 160, rng) - 0.82) / 0.1, 0, 1) * (1 - t)
    col = amber * (1 - t)[..., None] + dark * t[..., None]
    col = col * (1 - 0.5 * fleck[..., None]) + red * 0.5 * fleck[..., None]
    return save_png(col, path)


def soapbar(tag, cx, cy, ys_strings, z0, M, cover_mat, L=3.42, Wd=1.50, H=0.42):
    """Wide flat Jazzmaster pickup: a rounded cover with six flush poles and
    two screws through its ends."""
    parts = []
    cov = slab(f'{tag}_cover', rounded_rect(0, 0, Wd, L, 0.30), z0, z0 + H, cover_mat, r_top=0.08, steps=5)
    parts.append(cov)
    for i, ys in enumerate(ys_strings):
        y = ys - cy
        parts.append(place(lathe(f'{tag}_ph_{i}', [(0, 0.001), (0.12, 0.001), (0.12, 0.0), (0, 0.0)], M['hole'], seg=20), (0, y, z0 + H + 0.0005)))
        parts.append(place(lathe(f'{tag}_pole_{i}', [(0, 0.003), (0.094, 0.003), (0.099, -0.002), (0.099, -0.1), (0, -0.1)], M['pole'], seg=18), (0, y, z0 + H)))
    for s in (-1, 1):
        parts.append(screw(f'{tag}_screw_{s}', (0, s * (L / 2 - 0.30), z0 + H), M, d=0.15, h=0.035))
    for o in parts:
        o.matrix_world = Matrix.Translation(Vector((cx, cy, 0)) * IN) @ o.matrix_world
    return parts


def threaded_barrel(name, length, r, M, pitch=0.035, depth=0.012):
    """A threaded saddle barrel along local Z: the threads are the string grooves."""
    prof = [(0, 0)]
    n = int(length / pitch * 6)
    for k in range(n + 1):
        z = length * k / n
        prof.append((r - depth * (0.5 + 0.5 * math.cos(2 * math.pi * z / pitch)), z))
    prof.append((0, length))
    return lathe(name, prof, M['nickel'], seg=24, sharp=80)


def jm_bridge(ys_strings, crest_z, posts, M, z_post=0.0):
    """Floating Jazzmaster-type bridge: a chrome channel on two posts with six
    threaded barrels, one per string, each on its own intonation screw.
    crest_z[i]: height of the top of barrel i (where its string sits)."""
    parts, saddles = [], []
    L = abs(posts[0][1] - posts[1][1]) + 0.55
    zb = min(crest_z) - 0.26                         # channel floor
    base = slab('jm_base', rounded_rect(0, 0, 0.62, L, 0.12), zb - 0.05, zb, M['chrome'], r_top=0.02, r_bot=0.02, steps=2)
    parts.append(base)
    for sgn in (-1, 1):
        wall = prism_xz(f'jm_wall_{sgn}', [(-0.31, zb - 0.01), (0.31, zb - 0.01), (0.31, zb + 0.14), (-0.31, zb + 0.14)],
                        sgn * L / 2 - 0.05 if sgn > 0 else -L / 2, sgn * L / 2 if sgn > 0 else -L / 2 + 0.05, M['chrome'])
        parts.append(wall)
    for k, (px, py) in enumerate(posts):
        thim = lathe(f'jm_thimble_{k}', [(0, 0.03), (0.17, 0.03), (0.19, 0.0), (0.19, -0.3), (0, -0.3)], M['chrome'], seg=32)
        parts.append(place(thim, (px, py, z_post)))
        post = lathe(f'jm_post_{k}', [(0, zb - z_post - 0.04), (0.09, zb - z_post - 0.04), (0.09, 0.0), (0, 0.0)], M['steel'], seg=20)
        parts.append(place(post, (px, py, z_post)))
        parts.append(place(lathe(f'jm_postcap_{k}', [(0, 0.004), (0.06, 0.004), (0.06, 0.0), (0, 0.0)], M['hole'], seg=6),
                           (px, py, zb + 0.0005)))
    for i, y in enumerate(ys_strings):
        r = 0.085
        zc = crest_z[i] - r
        b = threaded_barrel(f'jm_barrel_{i}', 0.42, r, M)
        b.matrix_world = Matrix.Translation(Vector((-0.21, y, zc)) * IN) @ Matrix.Rotation(math.pi / 2, 4, 'Y')
        saddles.append(b)
        for dy in (-0.06, 0.06):
            hs = lathe(f'jm_hs_{i}_{dy}', [(0, zc - r - zb + 0.01), (0.03, zc - r - zb + 0.01), (0.03, 0.0), (0, 0.0)], M['steel'], seg=10)
            saddles.append(place(hs, (0.12 * (1 if dy > 0 else -1), y, zb)))
        isc = lathe(f'jm_is_{i}', [(0, 0), (0.026, 0), (0.026, 0.80), (0, 0.80)], M['steel'], seg=10)
        saddles.append(place(isc, (-0.40, y, zc), axis=(1, 0, 0)))
    return parts, saddles


def jm_vibrato(cx, ys_anchor, M, w=2.62, l=3.05, arm_dir=(-0.35, -0.94)):
    """Jazzmaster-type vibrato tailpiece: a chrome plate with a raised housing,
    the string anchor bar, the lock button and the arm.
    cx: X of the anchor bar; the plate runs back toward the tail."""
    parts = []
    x1 = cx + 0.45                                   # front edge, toward the bridge
    x0 = x1 - l
    outline = []
    for x, y in [(x1, w / 2 - 0.25), (x1 - 0.25, w / 2), (x0 + 0.5, w / 2 + 0.08), (x0, w / 2 - 0.35), (x0, -w / 2 + 0.35),
                 (x0 + 0.5, -w / 2 - 0.08), (x1 - 0.25, -w / 2), (x1, -w / 2 + 0.25)]:
        outline.append((x, y))
    plate = slab('vib_plate', catmull(outline, per=8), 0.0, 0.07, M['chrome'], r_top=0.03, steps=3)
    parts.append(plate)
    house = slab('vib_housing', rounded_rect(cx - 0.55, 0, 1.25, w - 0.45, 0.25), 0.07, 0.36, M['chrome'], r_top=0.10, steps=5)
    parts.append(house)
    bar = slab('vib_bar', rounded_rect(cx, 0, 0.30, w - 0.5, 0.12), 0.07, 0.44, M['chrome'], r_top=0.06, steps=4)
    parts.append(bar)
    for i, y in enumerate(ys_anchor):
        parts.append(place(lathe(f'vib_hole_{i}', [(0, 0.002), (0.045, 0.002), (0.045, 0.0), (0, 0.0)], M['hole'], seg=14), (cx + 0.15, y, 0.30),
                           axis=(1, 0, 0.6)))
    lock = lathe('vib_lock', [(0, 0.16), (0.13, 0.16), (0.16, 0.13), (0.16, 0.0), (0, 0.0)], M['chrome'], seg=28)
    parts.append(place(lock, (x0 + 0.55, 0.55, 0.07)))
    for k, (x, y) in enumerate([(x0 + 0.25, 0.85), (x0 + 0.25, -0.85), (x1 - 0.15, w / 2 - 0.22), (x1 - 0.15, -w / 2 + 0.22)]):
        parts.append(screw(f'vib_screw_{k}', (x, y, 0.07), M, d=0.17, h=0.04))
    # arm: out of a collar on the treble side, swung back over the body
    ax, ay = x0 + 1.0, -w / 2 + 0.45
    collar = lathe('vib_collar', [(0, 0.20), (0.13, 0.20), (0.15, 0.17), (0.15, 0.0), (0, 0.0)], M['chrome'], seg=24)
    parts.append(place(collar, (ax, ay, 0.36)))
    d = Vector((arm_dir[0], arm_dir[1], 0)).normalized()
    p0 = Vector((ax, ay, 0.50))
    path = [p0 - Vector((0, 0, 0.12)), p0]
    for k in range(1, 9):
        a = math.pi / 2 * k / 8
        path.append(p0 + (d * (1 - math.cos(a)) + Vector((0, 0, math.sin(a)))) * 0.16)
    end = path[-1]
    for k in range(1, 12):
        t = k / 11
        path.append(end + d * 4.2 * t + Vector((0, 0, 0.35 * t * t)))
    arm = [tube('vib_arm', [tuple(p) for p in path], 0.085, M['steel'], sides=16)]
    tipd = (path[-1] - path[-2]).normalized()
    tip = lathe('vib_tip', [(0, 0.9), (0.06, 0.895), (0.11, 0.87), (0.135, 0.82), (0.135, 0.05), (0.11, 0.0), (0, 0.0)], M['parchment'], seg=24)
    arm.append(place(tip, tuple(path[-1] - tipd * 0.05), axis=tuple(tipd)))
    return parts, arm


def push(outline, centre, radius, vec):
    """Move the outline near `centre` by `vec`, fading over `radius` (inches)."""
    out = []
    for p in outline:
        w = math.exp(-(math.dist(p, centre) / radius) ** 2)
        out.append((p[0] + vec[0] * w, p[1] + vec[1] * w))
    return out


def relax(outline, centre, r, rounds=8):
    """Soften the outline near `centre`: a few rounds of neighbour averaging."""
    P = [list(p) for p in outline]
    n = len(P)
    wts = [max(0.0, 1 - math.dist(p, centre) / r) ** 1.5 for p in P]
    for _ in range(rounds):
        Q = [p[:] for p in P]
        for i in range(n):
            if wts[i] > 0:
                a, b = P[i - 1], P[(i + 1) % n]
                Q[i][0] += 0.5 * wts[i] * ((a[0] + b[0]) / 2 - P[i][0])
                Q[i][1] += 0.5 * wts[i] * ((a[1] + b[1]) / 2 - P[i][1])
        P = Q
    return [tuple(p) for p in P]


def inset(poly, d):
    """Offset a closed outline inward by d (small d only)."""
    poly = ccw(list(poly)); n = vnormals(poly)
    return [(p[0] - q[0] * d, p[1] - q[1] * d) for p, q in zip(poly, n)]


def band(line, hw):
    """A plate shape: a strip of half-width hw along a polyline, round ends."""
    L = [Vector((x, y)) for x, y in line]
    left, right = [], []
    for k, p in enumerate(L):
        t = (L[min(k + 1, len(L) - 1)] - L[max(k - 1, 0)]).normalized()
        nrm = Vector((-t.y, t.x))
        left.append(p + nrm * hw); right.append(p - nrm * hw)
    t0 = (L[1] - L[0]).normalized(); t1 = (L[-1] - L[-2]).normalized()
    cap0 = [L[0] + (Vector((-t0.y, t0.x)) * math.cos(a) - t0 * math.sin(a)) * hw for a in np.linspace(0, math.pi, 14)[1:-1]]
    cap1 = [L[-1] + (Vector((t1.y, -t1.x)) * math.cos(a) + t1 * math.sin(a)) * hw for a in np.linspace(0, math.pi, 14)[1:-1]]
    return [(p.x, p.y) for p in right + cap1 + left[::-1] + cap0]


def ply_guard(line, layers, uv_origin=(-5.95, -8.25), uv_size=16.5):
    """A laminated guard: layers = [(thickness, material)] bottom up, each a
    little inset from the one below, so the bevelled edge shows the plies."""
    out, z = [], 0.0
    for k, (t, m) in enumerate(layers):
        last = k == len(layers) - 1
        out.append(slab(f'guard_ply{k}', inset(line, 0.011 * k) if k else line, z, z + t, m, r_top=0.012 if last else 0.0,
                        steps=2, uv_origin=uv_origin, uv_size=uv_size))
        z += t
    return out, z


def guard_screws(line, fracs, z, M, d_in=0.2):
    gp = ccw(list(line)); gn = vnormals(gp)
    out = []
    for k, f in enumerate(fracs):
        i = int(f * len(gp)) % len(gp)
        p, q = gp[i], gn[i]
        out.append(screw(f'pg_screw_{k}', (p[0] - q[0] * d_in, p[1] - q[1] * d_in, z), M))
    return out


# ================================================ the bolt-on house neck ==
class BoltOnNeck:
    """The Fender-pattern bolt-on neck the bolt-on KVELDs share with Floe:
    widths and side profile from the Telecaster neck drawing (tele.json), a
    separate fretboard on top, the six-in-line headstock, Floe's tuners.

    After build(): .groups has Neck, Fretboard, Frets, Dots, Nut, Tuners (with
    the string tree), Logo, Strings; .width(x), .board_z(y) are available."""

    def __init__(self, M, board_mat, neck_mat, scale=25.5, radius=7.25, frets=21, nut_half=0.826,
                 board_t=0.27, z_board=1.01 - 0.625, heel_x=None, dot_mat=None, logo_mat=None, width_k=1.0, board_x0=None):
        self.width_k = width_k
        self.board_x0 = board_x0
        T = json.load(open(os.path.join(ROOT, 'reference', 'telecaster', 'parsed', 'tele.json')))
        self.M, self.board_mat, self.neck_mat = M, board_mat, neck_mat
        self.scale, self.radius, self.n_frets, self.nut_half = scale, radius, frets, nut_half
        self.board_t, self.Z = board_t, z_board
        self.NUT_X0, self.NUT_X1 = scale, scale + 0.12
        nw = sorted(T['neck_width'])
        self.WX = np.array([p[0] for p in nw]); self.WL = np.array([p[1] for p in nw]); self.WR = np.array([p[2] for p in nw])
        pr = sorted(T['neck_profile'])
        self.PX = np.array([p[0] for p in pr]); self.PTOP = np.array([p[1] for p in pr]); self.PBACK = np.array([p[2] for p in pr])
        self.heel_x = heel_x if heel_x is not None else T['neck_pocket']['x_floor']
        self.BASS, self.TREB, self.HS_TIP, self.bass_edge, self.treb_edge = six_head_edges(self.NUT_X0)
        self.dot_mat = dot_mat or M['dot_pearl']
        self.logo_mat = logo_mat or M['logo_black']
        self.FACE_Z = z_board + float(np.interp(self.NUT_X0 + 3, self.PX, self.PTOP))
        self.BACK_Z = z_board + float(np.interp(self.NUT_X0 + 3, self.PX, self.PBACK))

    def width(self, x):
        if x <= self.NUT_X0:
            return float(np.interp(x, self.WX, self.WL)) * self.width_k, float(np.interp(x, self.WX, self.WR)) * self.width_k
        if x <= self.NUT_X1:
            return -self.nut_half, self.nut_half
        return self.TREB(x), self.BASS(x)

    def board_z(self, y):
        R = self.radius
        return self.Z - (R - math.sqrt(R * R - y * y))

    def build(self, y_bridge, crest, string_start, wrap=None):
        """crest[i] = (x, z) where string i leaves its saddle; string_start[i]
        = list of points before the crest (anchor, through-body, ...)."""
        M, Z, R = self.M, self.Z, self.radius
        NUT_X0, NUT_X1 = self.NUT_X0, self.NUT_X1
        blend = lambda a, b, t: a + (b - a) * (lambda u: u * u * (3 - 2 * u))(min(max(t, 0), 1))

        def top(x):
            z = Z + float(np.interp(x, self.PX, self.PTOP))
            return min(z, Z - self.board_t) if x > NUT_X0 else Z - self.board_t

        def carve(x):
            if x < 11.2:
                return blend(9.0, 2.35, (x - 10.1) / 1.1)
            if x > 24.0:
                return blend(2.35, 9.0, (x - 24.0) / 1.9)
            return 2.35

        S = NeckSpec(width=self.width, top=top, back=lambda x: Z + float(np.interp(x, self.PX, self.PBACK)), carve=carve,
                     sag=lambda x: 0.0, rs=lambda x: blend(0.012, 0.07, (x - NUT_X1) / 0.6), radius=R)
        tip = self.HS_TIP + NUT_X0
        st = stations_between(self.heel_x + 0.002, tip - 0.004,
                              fine=[(self.heel_x, self.heel_x + 0.4, 0.02), (NUT_X0 - 0.3, NUT_X0 + 1.6, 0.04), (tip - 0.5, 99, 0.02)])
        U0, US = 6.9, 26.4
        G = {}
        G['Neck'] = loft('Neck', st, lambda x: neck_section(S, x)[0], self.neck_mat, U0, US, 5.0)
        bx0 = self.board_x0 if self.board_x0 is not None else self.heel_x + 0.002
        G['Fretboard'] = fretboard('Fretboard', lambda x: self.width(min(x, NUT_X0)), R, Z, Z - self.board_t, bx0, NUT_X0,
                                   self.board_mat, u0=U0, us=US)
        self.fret_x = fret_positions(self.scale, self.n_frets)
        G['Frets'] = frets('Frets', self.fret_x, self.width, R, Z, M['fret'])
        self.marks = marker_positions(self.scale, self.n_frets)
        G['Dots'] = merge('Dots', dots(self.marks, R, Z, self.dot_mat, self.dot_mat, side_y=lambda x: self.width(x)[1],
                                       side_z=lambda x: Z - 0.13))
        G['Nut'] = nut('Nut', NUT_X0, NUT_X1, self.nut_half, R, Z, 0.058, Z - self.board_t - 0.02, M['bone'])
        HEAD = Matrix.Translation((0, 0, self.FACE_Z * IN))
        tun = []
        turns = (17, -24, 9, -13, 26, -6)
        for i, (hx, hy) in enumerate(SIX_POSTS):
            tun += tuner(i, NUT_X0 + hx, hy, +1, self.BACK_Z - self.FACE_Z, M, frame=HEAD, turn=math.radians(turns[i]))
        G['Logo'] = logo(BRAND, 0.272, 1.22, self.logo_mat, (27.82, -0.64, 0.003), frame=HEAD)
        y_nut = [0.705 - i * 0.282 for i in range(6)]
        tree_x, tree_y = 28.95, None
        strs = []
        for i in range(6):
            r = GAUGE[i] / 2
            xc, zc = crest[i]
            z_n = self.board_z(y_nut[i]) + 0.058
            path = list(string_start[i]) + [(xc, y_bridge[i], zc + r), (NUT_X0, y_nut[i], z_n + r), (NUT_X1, y_nut[i], z_n + r - 0.012)]
            hx, hy = SIX_POSTS[i]
            px, py = NUT_X0 + hx, hy
            if i in (4, 5):
                t = (tree_x - NUT_X1) / (px - NUT_X1)
                ty_ = y_nut[i] + (py - y_nut[i]) * t
                path.append((tree_x, ty_, self.FACE_Z + 0.13 + r))
                tree_y = ty_ if tree_y is None else (tree_y + ty_) / 2
            wrap_z = 0.10 + (0.16 if i in (4, 5) else 0.05 + 0.03 * i)
            strs.append(string_run(i, path, (px, py), 0.118, wrap_z, M, frame=Matrix.Translation((0, 0, self.FACE_Z))))
        tun.append(place(lathe('tree_base', [(0, 0.13), (0.06, 0.13), (0.06, 0.0), (0, 0.0)], M['chrome'], seg=16), (tree_x, tree_y, self.FACE_Z)))
        tun.append(slab('tree_wing', rounded_rect(tree_x, tree_y, 0.16, 0.46, 0.07), self.FACE_Z + 0.13 + 0.0115, self.FACE_Z + 0.16, M['chrome'],
                        r_top=0.01, steps=2))
        tun.append(screw('tree_screw', (tree_x, tree_y, self.FACE_Z + 0.16), M, d=0.12, h=0.03))
        G['Tuners'] = merge('Tuners', tun)
        G['Strings'] = merge('Strings', strs)
        self.groups = G
        self.y_nut = y_nut
        return G

    def page_neck(self):
        return ([(x, yr) for x, yr in zip(self.WX, self.WR)]
                + [(self.NUT_X0 + p[0], p[1]) for p in self.bass_edge] + [(self.NUT_X0 + p[0], p[1]) for p in self.treb_edge[::-1]]
                + [(x, yl) for x, yl in zip(self.WX[::-1], self.WL[::-1])])


# ================================================== the set-neck house neck ==
class SetNeck:
    """A glued-in neck with KVELD's three-a-side headstock.

    Built straight in its own frame (board crown at z_board, like the bolt-on
    neck), then pitched back by `pitch` degrees about the point where it leaves
    the body, so the strings rise toward the bridge. The headstock face is
    angled back `head_pitch` degrees from the nut and carries a black veneer.

    widths: nut_half at the nut, heel_half at x_heel (straight taper).
    depth(x): neck depth below the board crown (board included).
    """

    def __init__(self, M, board_mat, neck_mat, scale=24.75, radius=12.0, frets=22, nut_half=0.8475, heel_half=1.10,
                 board_t=0.25, z_board=0.40, x_joint=6.8, board_end=6.45, x_heel=3.0, pitch=2.0, head_pitch=13.0,
                 depth=None, bind=0.0, bind_mat=None, head_t=0.56, veneer_mat=None, logo_mat=None, dot_mat=None,
                 heel_drop=0.0, heel_len=2.2, side_limit=None):
        self.side_limit = side_limit          # x -> |y| the treble side must stay inside (a body wall), or None
        self.M, self.board_mat, self.neck_mat = M, board_mat, neck_mat
        self.scale, self.radius, self.n_frets = scale, radius, frets
        self.nut_half, self.heel_half = nut_half, heel_half
        self.board_t, self.Z, self.x_joint, self.board_end, self.x_heel = board_t, z_board, x_joint, board_end, x_heel
        self.pitch, self.hp = math.radians(pitch), math.radians(head_pitch)
        self.depth = depth or (lambda x: 0.80 + (0.88 - 0.80) * (scale - x) / (scale - 12.4) if x > 12.4 else 0.88 + 0.06 * (12.4 - x) / 12.4)
        self.bind, self.bind_mat = bind, bind_mat
        self.head_t = head_t
        self.heel_drop, self.heel_len = heel_drop, heel_len
        self.veneer_mat = veneer_mat
        self.logo_mat = logo_mat or M['logo_bone']
        self.dot_mat = dot_mat or M['dot_pearl']
        self.NUT_X0, self.NUT_X1 = scale, scale + 0.12
        self.ZT = z_board - board_t                       # neck wood top under the board, at the crown
        self.BASS, self.TREB, self.head_len, self.bass_run, self.treb_run = three_head_edges(0.0, nut_half)
        # pitch about the joint: neck frame -> body frame
        p = Vector((x_joint, 0, z_board))
        self.N2B = (Matrix.Translation(p) @ Matrix.Rotation(self.pitch, 4, 'Y') @ Matrix.Translation(-p))
        self.N2B_m = (Matrix.Translation(p * IN) @ Matrix.Rotation(self.pitch, 4, 'Y') @ Matrix.Translation(-p * IN))
        # the head frame: origin on the face at the nut's head side, x along the face, z out of it
        self.HEAD = Matrix.Translation(Vector((self.NUT_X1, 0, self.ZT))) @ Matrix.Rotation(self.hp, 4, 'Y')

    def face_z(self, x):
        return self.ZT - (x - self.NUT_X1) * math.tan(self.hp)

    def width(self, x):
        if x <= self.NUT_X0:
            t = (self.NUT_X0 - x) / (self.NUT_X0 - self.board_end)
            h = self.nut_half + (self.heel_half - self.nut_half) * min(max(t, 0), 1.1)
            lim = self.side_limit(x) if self.side_limit else None
            return (-min(h, lim) if lim else -h), h
        if x <= self.NUT_X1:
            return -self.nut_half, self.nut_half
        s = (x - self.NUT_X1) / math.cos(self.hp)            # distance along the face
        return self.TREB(s), self.BASS(s)

    def board_z(self, y):
        R = self.radius
        return self.Z - (R - math.sqrt(R * R - y * y))

    def to_body(self, p):
        return tuple(self.N2B @ Vector(p))

    def build(self):
        M, Z, R = self.M, self.Z, self.radius
        X0, X1 = self.NUT_X0, self.NUT_X1
        sm = lambda a, b, t: a + (b - a) * (lambda u: u * u * (3 - 2 * u))(min(max(t, 0), 1))
        hb = self.head_t / math.cos(self.hp)
        tip = X1 + self.head_len * math.cos(self.hp)

        # The headstock is a plate cut from its outline with true rounded edges
        # (lofted in upright slices, the angled head's edges came out faceted).
        # The neck loft runs on past the nut and morphs, section by section,
        # into a copy of the plate's own cross-section a hair (EPS) bigger, then
        # shrinks inside it and ends. So the back of the neck becomes the back
        # of the head along a tangent, with no seam where two shapes cross.
        sh, ch = math.sin(self.hp), math.cos(self.hp)
        EPS = 0.004
        B_END, GROW_END, LOFT_S = 0.5, 1.3, 1.7      # along the face: morph done, start shrinking, loft ends
        LOFT_END = X1 + LOFT_S * ch
        rt_of = lambda xh: 0.022 * smoothstep(0.02, 0.3, xh)
        # the back edge is rounded right off at the nut and sharpens to 0.07 in
        # by the first tuners; the morph is done before it starts, so the loft
        # follows the plate's own shape the whole way
        rb_of = lambda xh: 0.07 + (0.50 - 0.07) * (1 - smoothstep(0.5, 1.2, xh))

        def s_of(x):
            return (x - X1) / ch

        def to_body(xh, zh):
            return X1 + xh * ch + zh * sh, self.ZT - xh * sh + zh * ch

        def xh_at(x, zh):
            # where along the face a point zh deep sits, in the upright slice at x
            return (x - X1 - zh * sh) / ch

        def plate_bottom(x):
            return to_body(xh_at(x, -self.head_t), -self.head_t)[1]

        def grow(x):
            return sm(EPS, -2 * EPS, (s_of(x) - GROW_END) / (LOFT_S - GROW_END))

        def loft_width(x):
            if x <= X1:
                # a hair proud of the plate's hidden nose, whose sides meet the
                # neck's right at the nut (sharing a wall, they showed a seam)
                yl, yr = self.width(x)
                g = EPS * smoothstep(X1 - 0.6, X1 - 0.15, x)
                return yl - g, yr + g
            xh = s_of(x)
            return self.TREB(xh) - EPS, self.BASS(xh) + EPS

        def top(x):
            # inside the body (behind the board's end) the tenon stays below the
            # surface: left at the board's height it showed through the guard
            if x < self.board_end - 0.02:
                return self.ZT - 0.45
            if x <= X1:
                return self.ZT
            return self.face_z(x) - EPS * smoothstep(0.0, 0.1, s_of(x))      # just under the plate's face

        def back(x):
            # a heel: the neck deepens toward the joint to meet the body's back
            heel = self.heel_drop * (1 - smoothstep(self.x_joint, self.x_joint + self.heel_len, x)) ** 1.5
            neck = Z - self.depth(min(x, X0)) - heel
            if x < X0 - 1.0:
                return neck
            pb = plate_bottom(x) - EPS                  # never above the plate's back
            k = 0.06
            hh = min(max(0.5 + 0.5 * (pb - neck) / k, 0), 1)
            return pb * (1 - hh) + neck * hh - k * hh * (1 - hh)

        def carve(x):
            if x < self.x_heel + 1.0:
                return sm(6.0, 2.5, (x - self.x_heel) / 1.0)
            return sm(2.5, 4.6, (x - (X0 - 1.0)) / 1.1)       # fuller toward the head, so it covers the plate's rounded back

        S = NeckSpec(width=loft_width, top=top, back=back, carve=carve, sag=lambda x: 0.0,
                     rs=lambda x: 0.012 - 0.006 * smoothstep(X1 - 0.4, X1, x), radius=R, nb=120)

        def plate_section(x, e):
            """The plate cut by the upright plane at x, grown by e on its sides
            and back, its top EPS under the face; laid out point for point like
            neck_section, so the two can be blended."""
            NT, NB = 22, S.nb
            ztop = -EPS
            xt = xh_at(x, ztop)
            rt = rt_of(xt)
            P_ = lambda y, zh: (y, to_body(xh_at(x, zh), zh)[1])
            yb = lambda zh: self.BASS(xh_at(x, zh)) + e           # bass wall at that depth
            yt = lambda zh: self.TREB(xh_at(x, zh)) - e
            pts = []
            y0, y1 = self.TREB(xt) + rt, self.BASS(xt) - rt
            for k in range(NT + 1):
                pts.append(P_(y0 + (y1 - y0) * k / NT, ztop))

            def corner(phi, bass):
                zh = -rt + (rt - EPS) * math.sin(phi)
                n = rt - (rt + e) * math.cos(phi)
                return P_((self.BASS(xh_at(x, zh)) - n) if bass else (self.TREB(xh_at(x, zh)) + n), zh)
            for k in range(1, 6):
                pts.append(corner(math.radians(90 - 18 * k), True))
            # down the bass wall, round the back, up the treble wall
            zb = -self.head_t
            rb = rb_of(xh_at(x, zb))
            seg = []
            for k in range(0, 12):
                zh = -rt + (zb + rb + rt) * k / 12
                seg.append(P_(yb(zh), zh))
            for k in range(0, 13):
                ps = math.radians(90 * k / 12)
                zh = zb + rb - (rb + e) * math.sin(ps)
                seg.append(P_(self.BASS(xh_at(x, zh)) - rb + (rb + e) * math.cos(ps), zh))
            ya, yz = seg[-1][0], self.TREB(xh_at(x, zb - e)) + rb
            for k in range(1, 20):
                seg.append(P_(ya + (yz - ya) * k / 20, zb - e))
            for k in range(0, 13):
                ps = math.radians(90 - 90 * k / 12)
                zh = zb + rb - (rb + e) * math.sin(ps)
                seg.append(P_(self.TREB(xh_at(x, zh)) + rb - (rb + e) * math.cos(ps), zh))
            for k in range(1, 13):
                zh = zb + rb + (-rt - zb - rb) * k / 12
                seg.append(P_(yt(zh), zh))
            cum = [0]
            for p_, q_ in zip(seg, seg[1:]):
                cum.append(cum[-1] + math.dist(p_, q_))
            for k in range(1, NB):
                t = cum[-1] * k / NB
                j = next(j for j in range(1, len(cum)) if cum[j] >= t)
                f = (t - cum[j - 1]) / ((cum[j] - cum[j - 1]) or 1)
                pts.append((seg[j - 1][0] + (seg[j][0] - seg[j - 1][0]) * f, seg[j - 1][1] + (seg[j][1] - seg[j - 1][1]) * f))
            pts.append(seg[-1])
            for k in range(1, 5):
                pts.append(corner(math.radians(18 * k), False))
            return pts

        def section(x):
            # every section starts at the middle of its top, so the texture's
            # wrap seam runs under the board and the veneer, and the loft's
            # texture can be matched on the plate (plate_uv)
            pn = neck_section(S, x)[0]
            if x > X1:
                b = smoothstep(0.0, B_END, s_of(x))
                if b > 0:
                    pp = plate_section(x, grow(x))
                    pn = [(a_[0] + (c_[0] - a_[0]) * b, a_[1] + (c_[1] - a_[1]) * b) for a_, c_ in zip(pn, pp)]
            return pn[11:] + pn[:11]

        st = stations_between(self.x_heel, LOFT_END, fine=[(X0 - 1.2, LOFT_END, 0.025)])
        tip = X1 + self.head_len * math.cos(self.hp)
        U0, US = self.x_heel - 0.2, tip - self.x_heel + 0.4
        T = lambda v: tuple(self.N2B @ Vector(v))
        G = {}
        shaft = loft('Neck', st, section, self.neck_mat, U0, US, 5.0, transform=T)
        H_in0 = self.N2B @ self.HEAD
        H_m0 = Matrix.Translation(H_in0.to_translation() * IN) @ H_in0.to_3x3().to_4x4()
        # behind the nut the plate ends in a rounded nose, hidden inside the nut
        # and the board (square front corners folded over once rounded off)
        nose = [(-0.7 * math.cos(a), self.nut_half * math.sin(a)) for a in np.linspace(-math.pi / 2, math.pi / 2, 41)[1:-1]]
        outline = [(max(x, 0.0), y) for x, y in self.bass_run] + [(max(x, 0.0), y) for x, y in self.treb_run[::-1]] + nose
        outline = resample_poly(ccw(outline), 0.03)
        # near the nut the plate's back edge is rounded right off (0.5 in), so
        # its front sits inside the neck; the loft above copies the same radii
        plate = slab('head_plate', outline, -self.head_t, 0.0, self.neck_mat, r_top=0.022, r_bot=0.07, steps=9,
                     r_fn=lambda p: rt_of(p[0]) / 0.022,
                     r_fn_bot=lambda p: rb_of(p[0]) / 0.07,
                     uv_origin=(0, -2.5), uv_size=5.0)
        plate.matrix_world = H_m0
        self._plate_uv(plate, rt_of, rb_of, U0, US, 5.0)
        if os.environ.get('DBG_CONTAIN'):
            cache, worst = {}, []
            for v in plate.data.vertices:
                p_ = self.HEAD @ (v.co / IN)
                if not (X0 < p_.x < LOFT_END - 0.05):
                    continue
                kx = round(p_.x, 2)
                poly = cache.setdefault(kx, section(kx))
                y, z = p_.y, p_.z
                ins = False
                for (ay, az), (by, bz) in zip(poly, poly[1:] + poly[:1]):
                    if (az > z) != (bz > z) and y < ay + (z - az) * (by - ay) / (bz - az):
                        ins = not ins
                if not ins:
                    d = min(math.hypot(y - a[0], z - a[1]) for a in poly)
                    worst.append((d, round(s_of(p_.x), 3), round(y, 3), round(z - self.face_z(p_.x), 3)))
            worst.sort(reverse=True)
            worst = [w for w in worst if w[3] < -0.03 and w[1] < GROW_END]
            print("[contain] outside", len(worst), worst[:12])
        G['Neck'] = merge('Neck', [shaft, plate])
        bw = lambda x: self.width(min(x, X0))
        G['Fretboard'] = fretboard('Fretboard', bw, R, Z, self.ZT, self.board_end, X0, self.board_mat, bind_mat=self.bind_mat,
                                   bind=self.bind, u0=6.9, us=26.4, transform=T)
        self.fret_x = fret_positions(self.scale, self.n_frets)
        fret_in = self.bind + 0.004 if self.bind else 0.018
        G['Frets'] = frets('Frets', self.fret_x, bw, R, Z, M['fret'], inset=fret_in, transform=T)
        self.marks = marker_positions(self.scale, self.n_frets)
        dd = dots(self.marks, R, Z, self.dot_mat, self.dot_mat, side_y=lambda x: bw(x)[1], side_z=lambda x: Z - 0.10)
        for o in dd:
            o.matrix_world = self.N2B_m @ o.matrix_world
        G['Dots'] = merge('Dots', dd)
        G['Nut'] = nut('Nut', X0, X1, self.nut_half, R, Z, 0.058, self.ZT - 0.02, M['bone'], transform=T)
        # the head: veneer, tuners, logo, in the head frame (inches) -> metres
        H_in = self.N2B @ self.HEAD
        H_m = Matrix.Translation(H_in.to_translation() * IN) @ H_in.to_3x3().to_4x4()
        V = 0.03                                                       # veneer thickness
        poly = [(x, y) for x, y in self.bass_run] + [(x, y) for x, y in self.treb_run[::-1]]
        poly = [(max(x, 0.02), y) for x, y in poly]
        # evenly spaced: hundreds of tiny segments bunched at the tip made the
        # polygon fill give up on part of the face (bare wood showed through)
        poly = resample_poly(ccw(poly), 0.05)
        ven = slab('veneer', inset(poly, 0.026), 0.0, V, self.veneer_mat or M['plastic'], r_top=0.018, steps=3)
        ven.matrix_world = H_m
        tun = [ven]
        turns = (14, -20, 8, -12, 22, -6)
        for i, (hx, hy) in enumerate(THREE_POSTS):
            side = 1 if hy > 0 else -1
            fr = H_m @ Matrix.Translation((0, 0, V * IN))
            # each housing kept on the flat of the back, 0.1 in inside the edge
            # at its narrow (nut) end: where the head is narrow, the first pair
            # hung 0.15 in over the edge and looked to float
            edge = min(abs((self.BASS if side > 0 else self.TREB)(hx + d)) for d in (-0.28, 0.0, 0.28))
            off = min(0.0, edge - 0.10 - 0.39 - abs(hy))
            tun += tuner(i, hx, hy, side, -(self.head_t + V), M, frame=fr, turn=math.radians(turns[i]), offset=off,
                         shaft0=off + 0.37)
        G['Logo'] = logo(BRAND, 0.30, 1.22, self.logo_mat, (5.72, 0.0, V + 0.003), rot=-math.pi / 2, frame=H_m)
        G['Tuners'] = merge('Tuners', tun)
        self.H_in = H_in
        self.V = V
        self.groups = G
        return G

    def _plate_uv(self, plate, rt_of, rb_of, U0, US, VS):
        """The plate's texture laid out as the neck loft lays its own: u along
        the neck, v as the distance round the cross-section from the middle of
        the top. Where the loft hands over to the plate, the grain carries on
        (a planar map turned it sideways and showed a line across the back)."""
        sh, ch = math.sin(self.hp), math.cos(self.hp)
        ht = self.head_t
        k = (1 + 1 / ch) / 2              # the loft measures in upright slices: depths read 1/cos longer

        def uv(xh, y, zh):
            xw = max(xh, 0.0)
            hb, htr = self.BASS(xw), self.TREB(xw)
            rt, rb = rt_of(xw), rb_of(xw)
            yc = (hb + htr) / 2
            a1, a2, a3, a4 = hb - rt - yc, math.pi / 2 * rt * k, (ht - rt - rb) / ch, math.pi / 2 * rb * k
            a5 = (hb - rb) - (htr + rb)
            a1t = yc - (htr + rt)
            L = a1 + a2 + a3 + a4 + a5 + a4 + a3 + a2 + a1t
            zr = -ht + rb
            if zh > -rt and htr + rt <= y <= hb - rt:
                P = y - yc if y >= yc else L + (y - yc)
            elif zh < zr and htr + rb <= y <= hb - rb:
                P = a1 + a2 + a3 + a4 + (hb - rb - y)
            elif y >= yc:
                if zh > -rt:
                    P = a1 + rt * k * (math.pi / 2 - math.atan2(zh + rt, max(y - (hb - rt), 1e-9)))
                elif zh < zr:
                    P = a1 + a2 + a3 + rb * k * math.atan2(zr - zh, max(y - (hb - rb), 1e-9))
                else:
                    P = a1 + a2 + (-rt - zh) / ch
            else:
                C5 = a1 + a2 + a3 + a4 + a5
                if zh < zr:
                    P = C5 + rb * k * (math.pi / 2 - math.atan2(zr - zh, max((htr + rb) - y, 1e-9)))
                elif zh > -rt:
                    P = C5 + a4 + a3 + rt * k * math.atan2(zh + rt, max((htr + rt) - y, 1e-9))
                else:
                    P = C5 + a4 + (zh - zr) / ch
            x = self.NUT_X1 + xh * ch + zh * sh
            return ((x - U0) / US, P / VS)

        me = plate.data
        layer = me.uv_layers[0]
        co = [v.co / IN for v in me.vertices]
        for poly in me.polygons:
            for li in poly.loop_indices:
                p = co[me.loops[li].vertex_index]
                layer.data[li].uv = uv(p.x, p.y, p.z)

    def strings(self, anchors, crests, y_bridge):
        """anchors[i]: points (body frame) before the bridge; crests[i]: (x, z) of
        the saddle top in the body frame. Strings run to the nut and posts."""
        M = self.M
        y_nut = [0.715 - i * 0.286 for i in range(6)]          # 1.43 in E to E across a 1.695 in nut
        self.y_nut = y_nut
        out = []
        F = self.H_in @ Matrix.Translation((0, 0, self.V))
        order = [0, 1, 2, 5, 4, 3]           # THREE_POSTS: bass 0-2 from the nut, treble 3-5 from the nut
        for i in range(6):
            r = GAUGE[i] / 2
            zn = self.board_z(y_nut[i]) + 0.058
            path = list(anchors[i]) + [(crests[i][0], y_bridge[i], crests[i][1] + r),
                                       self.to_body((self.NUT_X0, y_nut[i], zn + r)), self.to_body((self.NUT_X1, y_nut[i], zn + r - 0.012))]
            hx, hy = THREE_POSTS[order[i]]
            wrap = 0.12 + 0.04 * (i % 3 if i < 3 else (5 - i))
            out.append(string_run(i, path, (hx, hy), 0.118, wrap, M, frame=F))
        return out

    def page_neck(self):
        xs = np.linspace(self.board_end, self.NUT_X0, 30)
        right = [(x, self.width(x)[1]) for x in xs]
        left = [(x, self.width(x)[0]) for x in xs[::-1]]
        hb = [(self.NUT_X1 + x * math.cos(self.hp), y) for x, y in self.bass_run]
        ht = [(self.NUT_X1 + x * math.cos(self.hp), y) for x, y in self.treb_run[::-1]]
        return right + hb + ht + left


# ============================================================ humbuckers ==
def pickup_ring(tag, cx, cy, M, z0, h_front=0.18, h_back=0.25, mat=None):
    """Raised plastic mounting ring, taller toward the bridge side (-x)."""
    outer = rounded_rect(0, 0, 1.56, 3.45, 0.18)
    hole = rounded_rect(0, 0, 1.40, 2.80, 0.10)
    ring = slab(f'{tag}_ring', outer, z0, z0 + 1.0, mat or M['plastic'], r_top=0.03, steps=2, holes=[hole])
    # slope the top: z scales from h_back at -x to h_front at +x
    me = ring.data
    for v in me.vertices:
        x = v.co.x / IN
        if v.co.z / IN > z0 + 0.5:
            hz = h_back + (h_front - h_back) * (x + 0.78) / 1.56
            v.co.z = (z0 + hz + (v.co.z / IN - z0 - 1.0)) * IN
    out = [ring]
    for k, (sx, sy) in enumerate([(0.62, 1.55), (-0.62, 1.55), (0.62, -1.55), (-0.62, -1.55)]):
        hz = h_back + (h_front - h_back) * (sx + 0.78) / 1.56
        out.append(screw(f'{tag}_rs_{k}', (sx, sy, z0 + hz), M, d=0.12, h=0.03))
    for o in out:
        o.matrix_world = Matrix.Translation(Vector((cx, cy, 0)) * IN) @ o.matrix_world
    return out


def humbucker(tag, cx, cy, ys_strings, z0, M, cover_mat=None, height=0.33):
    """Covered humbucker: a pressed metal cover with six screw poles on one row
    and six slug holes on the other."""
    out = []
    cov = slab(f'{tag}_cover', rounded_rect(0, 0, 1.35, 2.73, 0.10), z0, z0 + height, cover_mat or M['nickel'], r_top=0.05, steps=4)
    out.append(cov)
    for i, ys in enumerate(ys_strings):
        y = ys - cy
        for row, kind in ((0.27, 'screw'), (-0.27, 'slug')):
            out.append(place(lathe(f'{tag}_h_{row}_{i}', [(0, 0.001), (0.085, 0.001), (0.085, 0.0), (0, 0.0)], M['hole'], seg=16), (row, y, z0 + height + 0.0004)))
            if kind == 'screw':
                pole = lathe(f'{tag}_p_{i}', [(0, 0.03), (0.06, 0.028), (0.068, 0.02), (0.068, -0.05), (0, -0.05)], M['nickel'], seg=16)
                out.append(place(pole, (row, y, z0 + height)))
                out.append(slab(f'{tag}_ps_{i}', rounded_rect(row, y, 0.012, 0.09, 0.005), z0 + height + 0.0302, z0 + height + 0.031, M['hole']))
    for o in out:
        o.matrix_world = Matrix.Translation(Vector((cx, cy, 0)) * IN) @ o.matrix_world
    return out


# ======================================================= Gibson-type bridge ==
def tune_o_matic(posts, crests, ys, M, z_body=0.0):
    """Tune-o-matic style bridge on two posts with thumbwheels, set slanted
    between the posts. crests[i] = (x, z) of string i's saddle top."""
    parts, sad = [], []
    (bx, by), (tx, ty) = posts                                 # bass, treble
    cx, cy = (bx + tx) / 2, (by + ty) / 2
    ang = math.atan2(bx - tx, by - ty)                         # slant: bass end further back
    L = math.hypot(bx - tx, by - ty) + 0.42
    zc = min(z for _, z in crests)
    z_top = zc - 0.10                                           # top of the bridge body
    z_bot = z_top - 0.26
    body = slab('tom_body', rounded_rect(0, 0, 0.42, L, 0.08), z_bot, z_top, M['nickel'], r_top=0.04, r_bot=0.02, steps=3)
    body.matrix_world = Matrix.Translation(Vector((cx, cy, 0)) * IN) @ Matrix.Rotation(-ang, 4, 'Z')
    parts.append(body)
    for k, (px, py) in enumerate(posts):
        parts.append(place(lathe(f'tom_post_{k}', [(0, z_bot - z_body), (0.09, z_bot - z_body), (0.09, 0.0), (0, 0.0)], M['steel'], seg=16), (px, py, z_body)))
        parts.append(place(lathe(f'tom_bush_{k}', [(0, 0.02), (0.17, 0.02), (0.17, 0.0), (0, 0.0)], M['nickel'], seg=24), (px, py, z_body)))
        wheel = lathe(f'tom_wheel_{k}', [(0, 0.10), (0.20, 0.10), (0.22, 0.08), (0.22, 0.02), (0.20, 0.0), (0, 0.0)], M['nickel'], seg=64,
                      knurl=(0.02, 0.08, 48, 0.012))
        parts.append(place(wheel, (px, py, z_bot - 0.11)))
    xline = lambda y: tx + (y - ty) * (bx - tx) / (by - ty)       # the post line, slanted
    for i, y in enumerate(ys):
        xc, zs = crests[i]
        xf = xline(y) + 0.21                                        # the bridge's front face
        # saddle: a small block with a rounded top, slid along the bridge's slot
        prof = [(xc - 0.07, z_top - 0.05), (min(xc + 0.10, xf - 0.01), z_top - 0.05), (min(xc + 0.10, xf - 0.01), zs - 0.06),
                (xc + 0.05, zs - 0.012), (xc, zs), (xc - 0.05, zs - 0.012), (xc - 0.07, zs - 0.05)]
        sad.append(prism_xz(f'tom_saddle_{i}', prof, y - 0.16, y + 0.16, M['nickel']))
        sad.append(place(lathe(f'tom_screw_{i}', [(0, 0.04), (0.07, 0.04), (0.075, 0.03), (0.075, 0.0), (0, 0.0)], M['nickel'], seg=20),
                         (xf, y, z_top - 0.14), axis=(1, 0, 0)))
        slot = slab(f'tom_slot_{i}', rounded_rect(0, 0, 0.014, 0.10, 0.006), 0.0, 0.001, M['hole'])
        slot.matrix_world = Matrix.Translation(Vector((xf + 0.0405, y, z_top - 0.14)) * IN) @ Matrix.Rotation(math.pi / 2, 4, 'Y')
        sad.append(slot)
    return parts, sad


def stopbar(studs, M, z_body=0.0, height=0.30):
    """Stop tailpiece on two studs; returns parts and the string holes' points."""
    parts = []
    (bx, by), (tx, ty) = studs
    cx = (bx + tx) / 2
    L = abs(by - ty) + 0.55
    # the classic profile: a rounded bar, a little taller at the back
    prof = []
    for k in range(25):
        a = math.pi * 2 * k / 24
        prof.append((cx + 0.25 * math.cos(a), z_body + height + 0.18 + 0.20 * math.sin(a)))
    bar = prism_xz('stopbar', prof[:-1], -L / 2, L / 2, M['nickel'])
    # rounded ends
    parts.append(bar)
    for s in (-1, 1):
        cap = lathe(f'stop_cap_{s}', [(0, 0.0), (0.25, 0.0), (0.25, 0.02), (0.2, 0.06), (0, 0.08)], M['nickel'], seg=24)
        parts.append(place(cap, (cx, s * L / 2, z_body + height + 0.18), axis=(0, s, 0)))
    for k, (px, py) in enumerate(studs):
        parts.append(place(lathe(f'stud_{k}', [(0, height + 0.42), (0.12, height + 0.42), (0.14, height + 0.40), (0.14, 0.0), (0, 0.0)],
                                 M['nickel'], seg=24), (px, py, z_body)))
        parts.append(place(lathe(f'stud_slot_{k}', [(0, 0.001), (0.1, 0.001), (0.1, 0.0), (0, 0.0)], M['hole'], seg=12),
                           (px, py, z_body + height + 0.4205)))
        parts.append(place(lathe(f'stud_bush_{k}', [(0, 0.02), (0.20, 0.02), (0.20, 0.0), (0, 0.0)], M['nickel'], seg=24), (px, py, z_body)))
    return parts, (cx + 0.25, z_body + height + 0.18)


# ============================================================ figured tops ==
def edge_distance_grid(outline, origin, size, n=256):
    """Distance from each texel of a size x size window to the outline (inches),
    negative outside. Computed coarse and returned with its own sample grid."""
    xs = origin[0] + (np.arange(n) + 0.5) / n * size
    ys = origin[1] + (np.arange(n) + 0.5) / n * size
    X, Y = np.meshgrid(xs, ys)
    P = resample_poly(outline, 0.12)
    d = _dist_to_poly(X.ravel(), Y.ravel(), P).reshape(n, n)
    ins = inside(X.ravel(), Y.ravel(), P).reshape(n, n)
    return np.where(ins, d, -d)


def resample_poly(poly, step, closed=True):
    pts = list(poly) + ([poly[0]] if closed else [])
    out = [pts[0]]
    acc = 0.0
    for a, b in zip(pts, pts[1:]):
        L = math.dist(a, b)
        while acc + L >= step:
            t = (step - acc) / L
            a = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            out.append(a); L = math.dist(a, b); acc = 0.0
        acc += L
    return out


def upsample(a, n):
    """Bilinear upsample of a square array to n x n."""
    m = a.shape[0]
    t = (np.arange(n) + 0.5) / n * m - 0.5
    i0 = np.clip(np.floor(t).astype(int), 0, m - 1); i1 = np.clip(i0 + 1, 0, m - 1); f = np.clip(t - i0, 0, 1)
    rows = a[i0] * (1 - f)[:, None] + a[i1] * f[:, None]
    return rows[:, i0] * (1 - f)[None, :] + rows[:, i1] * f[None, :]


def figured_top_png(path, outline, origin, size, centre_col, edge_col, burst=2.2, flame=0.0, figure=0.5, n=2048, seed=9,
                    grain_col=None, normal_path=None, calm=False):
    """A maple top under a burst finish.
    flame: strength of the flame figure (0 plain, 1 strong); burst: how far in
    from the rim (inches) the edge colour reaches."""
    rng = np.random.default_rng(seed)
    xs = origin[0] + (np.arange(n) + 0.5) / n * size
    ys = origin[1] + (np.arange(n) + 0.5) / n * size
    X, Y = np.meshgrid(xs, ys)
    dist = upsample(edge_distance_grid(outline, origin, size, 256), n)
    # burst: a soft falloff from the rim inward, a little uneven, as if sprayed
    wob = (fbm(n, n, 4, 4, rng) - 0.5) * 0.5
    k = np.clip((dist + wob) / burst, 0, 1)
    k = k * k * (3 - 2 * k)
    col = np.array(edge_col)[None, None] * (1 - k[..., None]) + np.array(centre_col)[None, None] * k[..., None]
    if calm:
        # Calm figure (Fjord): grain as faint, broken lines and flame as
        # irregular bands that come and go, so nothing repeats on a grid.
        # (Even grain stripes crossed by even flame bands read as a
        # checkerboard under the clear coat: Sam's "noise".)
        rng = np.random.default_rng(seed + 101)
        warp = fbm(n, n, 4, 4, rng) - 0.5
        lines = fbm(n, n, 220, 6, rng, octaves=2)               # many thin lines along x, each its own strength
        grain = np.clip((lines - 0.55) / 0.25, 0, 1) * (0.5 + (fbm(n, n, 3, 3, rng) - 0.5))
        shade = 1 - 0.05 * figure * grain
        if flame > 0:
            fw = fbm(n, n, 2, 3, rng, octaves=5) - 0.5
            fv = fbm(n, n, 3, 14, rng, octaves=4) - 0.5
            ph = X * 1.9 + fv * 7.0 + fw * 3.0 + np.abs(Y) * 0.6 + warp * 1.5
            fl = (0.5 + 0.5 * np.sin(ph * 2 * math.pi)) ** 4
            mask = np.clip((fbm(n, n, 3, 5, rng, octaves=4) - 0.35) / 0.35, 0, 1) ** 1.5
            shade *= 1 - 0.30 * flame * fl * mask
            shade *= 1 + 0.10 * flame * (1 - fl) * mask
    else:
        # long grain along the body (x), fine
        warp = fbm(n, n, 3, 6, rng) - 0.5
        grain = 0.5 + 0.5 * np.sin((Y * 7.0 + warp * 1.6) * 2 * math.pi)
        shade = 1 - 0.06 * figure * grain
        if flame > 0:
            # flame: narrow bands across the grain, rippled and broken up,
            # bookmatched about the centre seam, stronger in patches
            fw = fbm(n, n, 3, 6, rng, octaves=4) - 0.5             # broad bends across the board
            fv = fbm(n, n, 2, 12, rng, octaves=3) - 0.5            # uneven spacing along it
            fine = fbm(n, n, 6, 60, rng, octaves=2) - 0.5
            ph = X * 2.9 + fv * 2.6 + fw * 1.7 + np.abs(Y) * 0.35 + fine * 0.25
            fl = (0.5 + 0.5 * np.sin(ph * 2 * math.pi)) ** 2
            mask = 0.55 + 0.45 * np.clip((fbm(n, n, 3, 4, rng) - 0.3) / 0.4, 0, 1)
            shade *= 1 - 0.30 * flame * fl * mask
            shade *= 1 + 0.12 * flame * (1 - fl) * mask
    mott = fbm(n, n, 6, 6, rng) - 0.5
    shade *= 1 + 0.05 * mott
    col = col * shade[..., None]
    seam = np.exp(-(Y / 0.012) ** 2)[..., None] * 0.06
    col *= 1 - seam
    return save_png(col, path)


def hole_walls(name, poly, top_fn, depth, wall_mat, floor_mat, floor_z):
    """Walls of a hole through the top (the plate's thickness) and a dark floor
    far below, so an f-hole reads as an opening into a hollow body."""
    poly = ccw(list(poly))
    n = len(poly)
    verts, faces, fm = [], [], []
    for p in poly:
        zt = top_fn(*p)
        verts.append((p[0], p[1], zt)); verts.append((p[0], p[1], zt - depth))
    for i in range(n):
        j = (i + 1) % n
        faces.append([2 * i, 2 * j, 2 * j + 1, 2 * i + 1]); fm.append(0)
    base = len(verts)
    for p in poly:
        verts.append((p[0], p[1], floor_z))
    for t in fill([poly]):
        faces.append([base + k for k in t]); fm.append(1)
    ob = obj_from(name, verts, faces, wall_mat, smooth_angle=40)
    ob.data.materials.append(floor_mat)
    ob.data.polygons.foreach_set('material_index', fm)
    return ob


def kveld_fhole(p0, c1, c2, p1, eye=0.20, w_mid=0.16, tail=0.035, n=60):
    """KVELD's sound hole: one long S-curve slot that grows from a fine point at
    the tail to a round eye at the neck end. (The original f has an eye at each
    end and notched waists.)"""
    P = [Vector(p0), Vector(c1), Vector(c2), Vector(p1)]
    def bez(t):
        u = 1 - t
        return P[0] * u * u * u + P[1] * 3 * u * u * t + P[2] * 3 * u * t * t + P[3] * t * t * t
    pts = [bez(k / n) for k in range(n + 1)]
    left, right = [], []
    for k, p in enumerate(pts):
        t = k / n
        d = (pts[min(k + 1, n)] - pts[max(k - 1, 0)]).normalized()
        nn = Vector((-d.y, d.x))
        w = tail + (w_mid / 2 - tail) * smoothstep(0, 0.55, t) + (eye - w_mid / 2) * smoothstep(0.62, 0.96, t)
        left.append(p + nn * w); right.append(p - nn * w)
    d = (pts[-1] - pts[-2]).normalized()
    nn = Vector((-d.y, d.x))
    cap = [pts[-1] + (nn * math.cos(a) + d * math.sin(a)) * eye for a in np.linspace(0, math.pi, 16)[1:-1]]
    tipd = (pts[0] - pts[1]).normalized()
    out = [pts[0] + tipd * 0.03] + right + cap[::-1] + left[::-1]
    # cap goes from +nn round the front to -nn: put it between right (−nn side) and left (+nn side)
    out = [pts[0] + tipd * 0.03] + right + [pts[-1] + (-nn * math.cos(a) + d * math.sin(a)) * eye for a in np.linspace(0, math.pi, 16)[1:-1]] + left[::-1]
    return [(p.x, p.y) for p in out]


class ArchMap:
    """Height of an arched top from nested contour loops (outermost first),
    interpolated by distance between neighbours, sampled once on a grid."""

    def __init__(self, outline, loops, levels, step=0.08, top=0.02, smooth=2):
        xs = [p[0] for p in outline]; ys = [p[1] for p in outline]
        self.x0, self.y0 = min(xs) - 0.2, min(ys) - 0.2
        self.step = step
        nx = int((max(xs) - self.x0 + 0.2) / step) + 2; ny = int((max(ys) - self.y0 + 0.2) / step) + 2
        GX, GY = np.meshgrid(self.x0 + np.arange(nx) * step, self.y0 + np.arange(ny) * step)
        gx, gy = GX.ravel(), GY.ravel()
        polys = [resample_poly(outline, 0.1)] + [resample_poly(l, 0.1) for l in loops]
        hs = [0.0] + list(levels)
        ins = [inside(gx, gy, p) for p in polys]
        dist = [_dist_to_poly(gx, gy, p) for p in polys]
        h = np.zeros_like(gx)
        depth = np.sum(np.array(ins), axis=0)                  # how many loops contain the point
        for k in range(len(polys)):
            sel = depth == k + 1
            if k + 1 < len(polys):
                d1, d2 = dist[k][sel], dist[k + 1][sel]
                h[sel] = hs[k] + (hs[k + 1] - hs[k]) * d1 / (d1 + d2 + 1e-9)
            else:
                d1 = dist[k][sel]
                h[sel] = hs[k] + top * (d1 / (d1 + 0.6))
        H = h.reshape(ny, nx)
        for _ in range(smooth):                                  # soften the creases where drawn halves meet
            P_ = np.pad(H, 1, mode='edge')
            H = (P_[1:-1, 1:-1] * 4 + P_[:-2, 1:-1] + P_[2:, 1:-1] + P_[1:-1, :-2] + P_[1:-1, 2:]) / 8
            H[~(depth.reshape(ny, nx) > 0)] = 0
        self.H = H

    def __call__(self, x, y):
        fx = (x - self.x0) / self.step; fy = (y - self.y0) / self.step
        i = int(min(max(math.floor(fx), 0), self.H.shape[1] - 2)); j = int(min(max(math.floor(fy), 0), self.H.shape[0] - 2))
        tx = min(max(fx - i, 0), 1); ty = min(max(fy - j, 0), 1)
        H = self.H
        return float(H[j, i] * (1 - tx) * (1 - ty) + H[j, i + 1] * tx * (1 - ty) + H[j + 1, i] * (1 - tx) * ty + H[j + 1, i + 1] * tx * ty)

    def normal(self, x, y, e=0.05):
        dx = (self(x + e, y) - self(x - e, y)) / (2 * e); dy = (self(x, y + e) - self(x, y - e)) / (2 * e)
        return tuple(Vector((-dx, -dy, 1)).normalized())



# ================================================== Axis-type hardware ==
def open_humbucker(tag, cx, cy, ys_strings, z0, M, bobbin_mat=None, height=0.32):
    """Uncovered humbucker mounted straight into the top: two bobbins (screw
    poles in one, slugs in the other), a baseplate with ears and two screws."""
    out = []
    bm = bobbin_mat or M['plastic']
    out.append(slab(f'{tag}_base', rounded_rect(0, 0, 1.40, 3.30, 0.12), z0, z0 + 0.03, M['nickel'], r_top=0.01, steps=1))
    for row in (0.33, -0.33):
        out.append(slab(f'{tag}_bob_{row}', rounded_rect(row, 0, 0.64, 2.70, 0.16), z0 + 0.03, z0 + height, bm, r_top=0.05, steps=4))
    for i, ys in enumerate(ys_strings):
        y = ys - cy
        pole = lathe(f'{tag}_ps_{i}', [(0, 0.035), (0.06, 0.033), (0.068, 0.022), (0.068, -0.05), (0, -0.05)], M['nickel'], seg=16)
        out.append(place(pole, (0.33, y, z0 + height)))
        out.append(slab(f'{tag}_pss_{i}', rounded_rect(0.33, y, 0.012, 0.09, 0.005), z0 + height + 0.0352, z0 + height + 0.036, M['hole']))
        slug = lathe(f'{tag}_sl_{i}', [(0, 0.003), (0.085, 0.003), (0.09, -0.002), (0.09, -0.05), (0, -0.05)], M['nickel'], seg=18)
        out.append(place(slug, (-0.33, y, z0 + height)))
    for s_ in (-1, 1):
        out.append(screw(f'{tag}_mount_{s_}', (0, s_ * 1.52, z0 + 0.03), M, d=0.14, h=0.035))
    for o in out:
        o.matrix_world = Matrix.Translation(Vector((cx, cy, 0)) * IN) @ o.matrix_world
    return out


def hardtail(crests, ys, M, front=0.55, depth=1.65, width=2.75):
    """Fixed bridge: a heavy plate, six block saddles on height screws, the
    strings coming up through the plate behind them. crests[i] = (x, z)."""
    parts, sad = [], []
    x1 = front; x0 = front - depth
    T = 0.12
    parts.append(slab('ht_plate', rounded_rect((x0 + x1) / 2, 0, depth, width, 0.18), 0.0, T, M['chrome'], r_top=0.03, steps=3))
    parts.append(prism_xz('ht_lip', [(x0, T), (x0 + 0.16, T), (x0 + 0.16, 0.42), (x0 + 0.04, 0.44), (x0, 0.40)],
                          -width / 2 + 0.12, width / 2 - 0.12, M['chrome']))
    for k, (x, y) in enumerate([(x1 - 0.18, 1.12), (x1 - 0.18, -1.12), (x0 + 0.38, 1.18), (x0 + 0.38, -1.18), (x1 - 0.18, 0.0)]):
        parts.append(screw(f'ht_screw_{k}', (x, y, T), M, d=0.17, h=0.04))
    holes = []
    for i, y in enumerate(ys):
        xc, zc = crests[i]
        prof = [(xc + 0.12, T + 0.02), (xc + 0.12, zc - 0.05), (xc + 0.06, zc - 0.006), (xc, zc), (xc - 0.10, zc - 0.012),
                (xc - 0.55, zc - 0.06), (xc - 0.62, zc - 0.10), (xc - 0.62, T + 0.02)]
        sad.append(prism_xz(f'ht_saddle_{i}', prof, y - 0.19, y + 0.19, M['chrome']))
        for dy in (-0.1, 0.1):
            sad.append(place(lathe(f'ht_hs_{i}_{dy}', [(0, 0.0012), (0.03, 0.0012), (0.03, 0.0), (0, 0.0)], M['hole'], seg=6),
                             (xc - 0.32, y + dy, zc - 0.05 + 0.0005), axis=(0.10, 0, 1)))
        ln = (xc - 0.62) - (x0 + 0.16)
        sad.append(place(lathe(f'ht_is_{i}', [(0, 0), (0.06, 0), (0.06, 0.04), (0.028, 0.04), (0.028, ln + 0.06), (0, ln + 0.06)], M['chrome'], seg=12),
                         (x0 + 0.12, y + 0.11, T + 0.10), axis=(1, 0, 0)))
        hx = xc - 0.80
        holes.append((hx, y))
        sad.append(place(lathe(f'ht_hole_{i}', [(0, 0.0015), (0.07, 0.0015), (0.07, 0.0), (0, 0.0)], M['hole'], seg=16), (hx, y, T)))
    return parts, sad, holes, T


def seat_humbucker(tag, cx, ys, z_surface, z_string, M, gap=0.13, cover=True, ring_mat=None, bobbin_mat=None, height=0.32):
    """A humbucker in its ring, raised so its top sits `gap` under the strings
    (as a player would set it), the ring tall enough to meet it."""
    z_hb = max(z_string - gap - height, z_surface + 0.03)
    h = z_hb + 0.03 - z_surface
    ring = pickup_ring(tag, cx, 0.0, M, z_surface, h_front=max(h - 0.03, 0.08), h_back=h + 0.03, mat=ring_mat)
    if cover:
        hb = humbucker(tag, cx, 0.0, ys, z_hb, M, height=height)
    else:
        hb = open_humbucker(tag, cx, 0.0, ys, z_hb, M, bobbin_mat=bobbin_mat, height=height)
    return ring, hb


def string_z(crests, nut_pt, x):
    """Height of the middle of the string plane at station x (body frame)."""
    xc = sum(c[0] for c in crests) / len(crests); zc = sum(c[1] for c in crests) / len(crests)
    xn, zn = nut_pt
    return zc + (zn - zc) * (x - xc) / (xn - xc)


class SmoothField:
    """A height function resampled on a fine grid and softened, so carves and
    contours built from polylines (with their small kinks where the nearest
    segment changes) become one smooth surface. Bilinear between samples."""

    def __init__(self, fn, outline, step=0.04, blur=4, pad=0.3):
        xs = [p[0] for p in outline]; ys = [p[1] for p in outline]
        self.x0, self.y0, self.step = min(xs) - pad, min(ys) - pad, step
        nx = int((max(xs) - self.x0 + pad) / step) + 2; ny = int((max(ys) - self.y0 + pad) / step) + 2
        H = np.array([[fn(self.x0 + i * step, self.y0 + j * step) for i in range(nx)] for j in range(ny)])
        k = np.array([1, 4, 6, 4, 1], float); k /= k.sum()
        for _ in range(blur):
            P_ = np.pad(H, 2, mode='edge')
            H = sum(k[a] * P_[a:a + ny, 2:-2] for a in range(5))
            P_ = np.pad(H, 2, mode='edge')
            H = sum(k[a] * P_[2:-2, a:a + nx] for a in range(5))
        self.H = H

    def __call__(self, x, y):
        fx = (x - self.x0) / self.step; fy = (y - self.y0) / self.step
        i = int(min(max(math.floor(fx), 0), self.H.shape[1] - 2)); j = int(min(max(math.floor(fy), 0), self.H.shape[0] - 2))
        tx = min(max(fx - i, 0), 1); ty = min(max(fy - j, 0), 1)
        H = self.H
        return float(H[j, i] * (1 - tx) * (1 - ty) + H[j, i + 1] * tx * (1 - ty) + H[j + 1, i] * (1 - tx) * ty + H[j + 1, i + 1] * tx * ty)


def smax(a, b, k=0.03):
    """Smooth maximum: no crease where two carves cross."""
    return 0.5 * (a + b + math.sqrt((a - b) ** 2 + k * k)) - 0.5 * k


def contour_grid(edge_poly, line_pts, depth, X, Y, power=1.8, side=1, taper=0.22):
    """contour_fn over whole arrays at once (same result, for SmoothField)."""
    L = np.array(line_pts, float)
    seg_len = np.hypot(*(L[1:] - L[:-1]).T)
    total = seg_len.sum()
    best_d = np.full(X.shape, 1e9); best_s = np.zeros(X.shape); best_u = np.zeros(X.shape)
    acc = 0.0
    for (ax, ay), (bx, by), l in zip(L[:-1], L[1:], seg_len):
        ex, ey = bx - ax, by - ay
        t = np.clip(((X - ax) * ex + (Y - ay) * ey) / (l * l), 0, 1)
        d = np.hypot(X - ax - t * ex, Y - ay - t * ey)
        s = side * (ex * (Y - ay) - ey * (X - ax))
        m = d < best_d
        best_d = np.where(m, d, best_d); best_s = np.where(m, s, best_s); best_u = np.where(m, (acc + t * l) / total, best_u)
        acc += l
    de = _dist_to_poly(X, Y, ccw(list(edge_poly)))
    t = best_d / (best_d + de + 1e-9)
    ss = lambda a, b, x: np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))
    tp = ss(0, taper, best_u) * ss(1, 1 - taper, best_u)
    return np.where(best_s > 0, depth * tp * t ** power, 0.0)


class SmoothGrid(SmoothField):
    """SmoothField from a function that takes whole arrays (X, Y) -> heights."""

    def __init__(self, grid_fn, outline, step=0.04, blur=4, pad=0.3):
        xs = [p[0] for p in outline]; ys = [p[1] for p in outline]
        self.x0, self.y0, self.step = min(xs) - pad, min(ys) - pad, step
        nx = int((max(xs) - self.x0 + pad) / step) + 2; ny = int((max(ys) - self.y0 + pad) / step) + 2
        GX, GY = np.meshgrid(self.x0 + np.arange(nx) * step, self.y0 + np.arange(ny) * step)
        H = grid_fn(GX, GY)
        k = np.array([1, 4, 6, 4, 1], float); k /= k.sum()
        for _ in range(blur):
            P_ = np.pad(H, 2, mode='edge'); H = sum(k[a] * P_[a:a + ny, 2:-2] for a in range(5))
            P_ = np.pad(H, 2, mode='edge'); H = sum(k[a] * P_[2:-2, a:a + nx] for a in range(5))
        self.H = H


def line_widths(line, side, max_w=4.5):
    """For edge_band_grid(w_fn=...): each rim point's distance to a drawn contour
    line, where the rim lies on the falling side of it (side as in contour_fn)
    and squarely beside it (not past its ends), 0 elsewhere. The line's ends
    meet the rim, so the width runs out to nothing there by itself."""
    L = np.array(line, float)
    A, B = L[:-1], L[1:]
    E = B - A; l2 = np.maximum((E ** 2).sum(1), 1e-12)

    def f(rim):
        rx = rim[:, None, 0] - A[None, :, 0]; ry = rim[:, None, 1] - A[None, :, 1]
        t = (rx * E[None, :, 0] + ry * E[None, :, 1]) / l2[None, :]
        tc = np.clip(t, 0, 1)
        d = np.hypot(rx - tc * E[None, :, 0], ry - tc * E[None, :, 1])
        k = np.argmin(d, 1); idx = np.arange(len(rim))
        dm = d[idx, k]; tk = t[idx, k]
        cross = side * (E[k, 0] * ry[idx, k] - E[k, 1] * rx[idx, k])
        past = ((k == 0) & (tk < 0)) | ((k == len(A) - 1) & (tk > 1))
        return np.where((cross > 0) & ~past & (dm < max_w), dm, 0.0)
    return f


def edge_band_grid(outline, lines, depth, X, Y, fades=(), soft=0.08, win=0.6, step=0.02, ease=1.0, w_ref=0.5, power=1.0, nearest=False, w_fn=None):
    """A bevel as an even band along the rim: beside each drawn bevel line the
    band is as wide as the line is from the rim, that width smoothed along the
    rim, and any point inside is lowered by how far into the band it sits, with
    a softly rounded crest. Gives clean reflections where a chamfer built
    straight from the polyline went wavy.

    Each line paints only the stretch of rim it runs beside (every line point
    marks its nearest rim point), and eases out over `ease` inches past its
    ends. Where the band narrows the depth at the rim narrows with it (below
    `w_ref` wide), so a band never ends in a step down the rim.
    fades: [(point, radius)] where the band dies away (the neck joint)."""
    rim = np.array(resample_poly(ccw(list(outline)), step))
    n = len(rim)
    w = np.zeros(n)
    rn = np.array(vnormals([tuple(p) for p in rim]))
    if w_fn is not None:
        w = np.maximum(w, w_fn(rim))                   # widths given along the rim directly
    for ln in lines:
        # the drawn lines are open: closed up, a chord from one end back to the
        # other ran straight across the body and through the horns
        L = np.array(resample_poly(list(ln), step, closed=False), float)
        dx = rim[None, :, 0] - L[:, None, 0]; dy = rim[None, :, 1] - L[:, None, 1]
        d2 = dx ** 2 + dy ** 2
        # only rim the line point faces: straight out along the rim's normal.
        # (Across a narrow horn the nearest rim can be the far side, and the
        # band there came out 1.5 in wide where the plan draws 0.3.)
        cosn = (dx * rn[None, :, 0] + dy * rn[None, :, 1]) / np.sqrt(np.maximum(d2, 1e-12))
        d0 = np.sqrt(d2.min(1))                       # nearest rim of any kind
        d2 = np.where(cosn > 0.6, d2, np.inf)
        j = np.argmin(d2, 1); d = np.sqrt(d2[np.arange(len(L)), j])
        okj = np.isfinite(d) & (d < d0 + 0.25)         # and nearly as near: no reaching across the body
        L, j, d = L[okj], j[okj], d[okj]
        if os.environ.get('DBG_BAND'):
            print('[bl] line', len(okj), 'valid', int(okj.sum()), 'd pct', np.round(np.percentile(d, [5, 50, 95, 100]), 2) if len(d) else None)
            for k_ in range(0, len(L), max(1, len(L) // 8)):
                print('[bl]   L', np.round(L[k_], 2), '-> rim', np.round(rim[j[k_]], 2), 'd', round(float(d[k_]), 2))
        # fill between neighbouring readings along the rim (short gaps only: a
        # stray reading must not paint half the rim), and ease out at both ends
        gap = int(0.6 / step)
        e = int(ease / step)
        fall = lambda t: 1 - t * t * (3 - 2 * t)
        idx, val = [], []
        for (ja, da), (jb, db) in zip(zip(j, d), zip(j[1:], d[1:])):
            dj = (int(jb) - int(ja) + n // 2) % n - n // 2
            if abs(dj) > gap:
                continue
            for t in range(abs(dj) + 1):
                idx.append((int(ja) + (t if dj >= 0 else -t)) % n)
                val.append(da + (db - da) * (t / abs(dj) if dj else 0))
        if len(j) > 2:
            for (j0, d0, j1) in ((j[0], d[0], j[min(3, len(j) - 1)]), (j[-1], d[-1], j[max(-4, -len(j))])):
                dirn = -1 if ((int(j1) - int(j0) + n // 2) % n - n // 2) > 0 else 1
                for t in range(1, e + 1):
                    idx.append((int(j0) + dirn * t) % n)
                    val.append(d0 * fall(t / e))
        if idx:
            np.maximum.at(w, np.array(idx), np.array(val))
    for (fx, fy), r in fades:
        dd = np.hypot(rim[:, 0] - fx, rim[:, 1] - fy)
        w *= np.clip((dd - r * 0.4) / (r * 0.6), 0, 1) ** 2
    w_raw = w.copy()
    # smooth along the rim (circular moving average), twice
    k = max(3, int(win / step) | 1)
    for _ in range(2):
        pad = np.concatenate([w[-k:], w, w[:k]])
        w = np.convolve(pad, np.ones(k) / k, mode='same')[k:-k]
    if os.environ.get('DBG_W') and nearest:
        on = np.nonzero(w > 0.02)[0]
        print('[w] raw zeros inside the run:', int(((w_raw[on.min():on.max()] if len(on) else w_raw[:0]) < 1e-3).sum()), 'of', len(on))
        print('[w] smoothed every 0.4 in:', [round(float(v), 2) for v in w[on][::20]])
        print('[w] raw every 0.4 in:', [round(float(v), 2) for v in w_raw[on][::20]])
    if os.environ.get('DBG_BAND'):
        for qx, qy in [(6.14, 1.7), (6.0, 2.1), (5.9, 2.4), (5.7, 2.9), (6.06, -1.73), (5.95, -2.1), (5.85, -2.4), (5.7, -2.9)]:
            j = int(np.argmin(np.hypot(rim[:, 0] - qx, rim[:, 1] - qy)))
            print('[band] rim %5.2f %5.2f  raw %.2f  smooth %.2f' % (rim[j, 0], rim[j, 1], w_raw[j], w[j]))
    tt = np.clip(w / w_ref, 0, 1)
    dep = tt * tt * (3 - 2 * tt)                       # rim depth, as a fraction of `depth`
    if nearest:
        # depth from the distance to the nearest point of the rim, and that
        # point's band: smooth over a convex bout (where the nearest rim point
        # moves steadily), where the max over every rim point left fine streaks
        P = np.stack([X.ravel(), Y.ravel()], 1)
        u = np.zeros(len(P))
        for s in range(0, len(P), 3000):
            q = P[s:s + 3000]
            d2 = (q[:, None, 0] - rim[None, :, 0]) ** 2 + (q[:, None, 1] - rim[None, :, 1]) ** 2
            j = np.argmin(d2, 1); de = np.sqrt(d2[np.arange(len(q)), j])
            u[s:s + 3000] = np.where(w[j] > 1e-3, dep[j] * (1 - de / np.maximum(w[j], 1e-3)), 0.0)
        us = 0.5 * (u + np.sqrt(u * u + soft * soft)) - 0.5 * soft
        us = np.clip(us / (1 - 0.5 * soft), 0, 1)
        return (depth * us ** power).reshape(X.shape)
    keep = w > 1e-3
    R_, W_, D_ = rim[keep], w[keep], dep[keep]
    # every grid point: the deepest any banded rim point puts it (a max of
    # continuous ramps, so no cliff where the nearest rim changes)
    P = np.stack([X.ravel(), Y.ravel()], 1)
    u = np.zeros(len(P))
    for s in range(0, len(P), 3000):
        q = P[s:s + 3000]
        d = np.sqrt((q[:, None, 0] - R_[None, :, 0]) ** 2 + (q[:, None, 1] - R_[None, :, 1]) ** 2)
        u[s:s + 3000] = (D_[None, :] * (1 - d / W_[None, :])).max(1)
    us = 0.5 * (u + np.sqrt(u * u + soft * soft)) - 0.5 * soft          # soft ramp: rounded crest at u = 0
    us = np.clip(us / (1 - 0.5 * soft), 0, 1)
    # power > 1 rolls the profile: level where it leaves the top, steepening to the rim (a comfort contour)
    return (depth * us ** power).reshape(X.shape)
