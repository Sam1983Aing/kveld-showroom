"""KVELD kit: what every guitar in the range is built from.

Shared by blender/build_floe.py and blender/build_<id>.py. The mesh builders
and the texture helpers came out of build_floe.py unchanged, so Floe rebuilds
identical. Units: inches in, metres out (IN).

  import kveld_kit as K
  K.begin('Heath')            # empty scene, one collection
  M = K.house_materials()     # the shared metals, strings, bone, plastics
"""
import json, math, os, sys

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
IN = 0.0254
root_col = None


def begin(name):
    """Empty scene with one collection that every builder links into."""
    global root_col
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    root_col = bpy.data.collections.new(name)
    scene.collection.children.link(root_col)
    MATS.clear()
    return scene


# ----------------------------------------------------------- materials ----
MATS = {}

def principled(name, color, rough, metal=0.0, coat=0.0, coat_rough=0.03, tex=None, alpha=None, normal=None, normal_strength=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1.0)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = coat_rough
    if tex:
        img = bpy.data.images.load(tex, check_existing=True)
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = img
        nt.links.new(n.outputs['Color'], p.inputs['Base Color'])
    if normal:
        # relief on the base layer only: the coat keeps the geometric normal,
        # so the grain reads as depth under a smooth, glassy finish
        img = bpy.data.images.load(normal, check_existing=True)
        img.colorspace_settings.name = 'Non-Color'
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = img
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = normal_strength
        nt.links.new(n.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m
    return m


def srgb(c):
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)


# ------------------------------------------------------------ textures ----
def value_noise(h, w, cells_y, cells_x, rng):
    g = rng.random((cells_y + 3, cells_x + 3))
    ys = np.linspace(0, cells_y, h, endpoint=False)
    xs = np.linspace(0, cells_x, w, endpoint=False)
    iy = ys.astype(int); fy = ys - iy
    ix = xs.astype(int); fx = xs - ix
    fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
    a = g[iy][:, ix]; b = g[iy][:, ix + 1]; c = g[iy + 1][:, ix]; d = g[iy + 1][:, ix + 1]
    top = a + (b - a) * fx[None, :]; bot = c + (d - c) * fx[None, :]
    return top + (bot - top) * fy[:, None]


def fbm(h, w, cy, cx, rng, octaves=4):
    out = np.zeros((h, w)); amp = 1.0; tot = 0
    for o in range(octaves):
        out += amp * value_noise(h, w, cy * 2 ** o, cx * 2 ** o, rng); tot += amp; amp *= 0.5
    return out / tot


def save_png(arr, path):
    h, w, _ = arr.shape
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=False)
    rgba = np.ones((h, w, 4), np.float32)
    rgba[..., :3] = np.clip(arr, 0, 1)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    return path


def normal_png(height, px, path, tilt=0.35):
    """Tangent-space normal map from a height field (inches), px = texel size."""
    gy, gx = np.gradient(height, px)
    k = tilt / max(np.percentile(np.hypot(gx, gy), 99.5), 1e-9)   # the steepest pores lean ~tilt
    nx, ny = -gx * k, -gy * k
    nz = np.ones_like(nx)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    return save_png(np.stack([nx / ln, ny / ln, nz / ln], -1) * 0.5 + 0.5, path)


# ------------------------------------------------------ mesh builders ----
def obj_from(name, verts, faces, mat, uvs=None, normals=None, smooth_angle=None, parent=None, weld=False, recalc=False):
    """verts in inches. uvs: per-face list of (u, v) per corner."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x * IN, y * IN, z * IN) for x, y, z in verts], [], faces)
    if uvs is not None:
        layer = me.uv_layers.new(name='UVMap')
        flat = [uv for face in uvs for uv in face]
        layer.data.foreach_set('uv', [c for uv in flat for c in uv])
    me.validate(clean_customdata=False)
    if weld or recalc:
        bm = bmesh.new(); bm.from_mesh(me)
        if weld:
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
        if recalc:
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free()
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    if normals is not None:
        me.normals_split_custom_set_from_vertices([Vector(n).normalized() for n in normals])
    elif smooth_angle is not None:
        me.set_sharp_from_angle(angle=math.radians(smooth_angle))
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    root_col.objects.link(ob)
    if parent:
        ob.parent = parent
    return ob


def merge(name, objs):
    """Join objects into one (keeps per-face materials)."""
    objs = [o for o in objs if o]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob


def area(poly):
    return 0.5 * sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1]))


def ccw(poly):
    return poly if area(poly) > 0 else poly[::-1]


def vnormals(poly):
    """Outward unit normals at each vertex of a CCW polygon."""
    n = len(poly); out = []
    for i in range(n):
        a, b, c = poly[i - 1], poly[i], poly[(i + 1) % n]
        e1 = (b[0] - a[0], b[1] - a[1]); e2 = (c[0] - b[0], c[1] - b[1])
        n1 = (e1[1], -e1[0]); n2 = (e2[1], -e2[0])
        l1 = math.hypot(*n1) or 1; l2 = math.hypot(*n2) or 1
        v = (n1[0] / l1 + n2[0] / l2, n1[1] / l1 + n2[1] / l2)
        l = math.hypot(*v) or 1
        out.append((v[0] / l, v[1] / l))
    return out


def fill(loops):
    """Triangulate a region: loops[0] outer, the rest holes. Returns index triangles."""
    # A roundover as deep as the corner radius collapses each corner arc onto
    # one point. Coincident neighbours are merged here: left in, they break
    # triangle_fill and the cap comes out with holes (the tuner housings did).
    bm = bmesh.new()
    first = []                     # bmesh vert -> index of the first input point that made it
    edges = set()
    k = 0
    for loop in loops:
        ring, last = [], None
        for p in loop:
            if last is not None and math.dist(p, last) < 1e-7:
                k += 1
                continue
            bm.verts.new((p[0], p[1], 0))
            first.append(k)
            ring.append(len(first) - 1)
            last = p
            k += 1
        if len(ring) > 2 and math.dist(loop[0], last) < 1e-7:
            ring.pop()
        for i in range(len(ring)):
            a, b = ring[i], ring[(i + 1) % len(ring)]
            edges.add((min(a, b), max(a, b)))
    bm.verts.ensure_lookup_table()
    E = [bm.edges.new((bm.verts[a], bm.verts[b])) for a, b in sorted(edges)]
    res = bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=E)
    tris = []
    for f in res['geom']:
        if isinstance(f, bmesh.types.BMFace):
            idx = [v.index for v in f.verts]
            a, b, c = [bm.verts[i].co for i in idx]
            if (b - a).cross(c - a).z < 0:
                idx = idx[::-1]
            tris.append([first[i] for i in idx])
    bm.free()
    return tris


def slab(name, outline, z0, z1, mat, r_top=0.0, r_bot=0.0, steps=5, holes=(), uv='planar',
         r_fn=None, uv_origin=(0, 0), uv_size=1.0, parent=None, r_fn_bot=None):
    """Extruded outline with rounded (circular) top/bottom edges and exact normals.
    r_fn(i) can scale the edge radius per outline vertex (r_fn_bot, if given,
    the bottom edge's separately)."""
    outline = ccw(list(outline))
    loops = [(outline, 1)] + [(ccw(list(h))[::-1], -1) for h in holes]
    verts, norms, faces, fuv = [], [], [], []
    top_rings, bot_rings = [], []

    def puv(x, y):
        return ((x - uv_origin[0]) / uv_size, (y - uv_origin[1]) / uv_size)

    for poly, sign in loops:
        nrm = vnormals(poly)
        n = len(poly)
        rs_t = [r_top * (r_fn(poly[i]) if r_fn and sign > 0 else 1) for i in range(n)]
        rs_b = [r_bot * ((r_fn_bot or r_fn)(poly[i]) if (r_fn_bot or r_fn) and sign > 0 else 1) for i in range(n)]
        rings = []   # list of (list of vertex indices, kind)
        # top roundover, from the top face down to the side
        for k in range(steps + 1 if r_top > 0 else 1):
            phi = math.pi / 2 * (1 - k / steps) if r_top > 0 else 0.0
            ring = []
            for i, (p, q) in enumerate(zip(poly, nrm)):
                r = rs_t[i]
                d = r - r * math.cos(phi) if r_top > 0 else 0
                z = z1 - r + r * math.sin(phi) if r_top > 0 else z1
                verts.append((p[0] - q[0] * d, p[1] - q[1] * d, z))
                norms.append((q[0] * math.cos(phi), q[1] * math.cos(phi), math.sin(phi)) if r_top > 0 else (q[0], q[1], 0))
                ring.append(len(verts) - 1)
            rings.append(ring)
        if r_top == 0:
            # sharp top edge: separate ring for the top face
            ring = []
            for p in poly:
                verts.append((p[0], p[1], z1)); norms.append((0, 0, 1)); ring.append(len(verts) - 1)
            top_ring = ring
        else:
            top_ring = rings[0]
        side_top = rings[-1]
        brings = []
        for k in range(steps + 1 if r_bot > 0 else 1):
            phi = -math.pi / 2 * (k / steps) if r_bot > 0 else 0.0
            ring = []
            for i, (p, q) in enumerate(zip(poly, nrm)):
                r = rs_b[i]
                d = r - r * math.cos(phi) if r_bot > 0 else 0
                z = z0 + r + r * math.sin(phi) if r_bot > 0 else z0
                verts.append((p[0] - q[0] * d, p[1] - q[1] * d, z))
                norms.append((q[0] * math.cos(phi), q[1] * math.cos(phi), math.sin(phi)) if r_bot > 0 else (q[0], q[1], 0))
                ring.append(len(verts) - 1)
            brings.append(ring)
        if r_bot == 0:
            ring = []
            for p in poly:
                verts.append((p[0], p[1], z0)); norms.append((0, 0, -1)); ring.append(len(verts) - 1)
            bot_ring = ring
        else:
            bot_ring = brings[-1]
        # quads between successive rings (top roundover, side, bottom roundover)
        seq = rings + brings
        per = [0.0]
        for i in range(1, n + 1):
            per.append(per[-1] + math.dist(poly[i - 1], poly[i % n]))
        for a_ring, b_ring in zip(seq, seq[1:]):
            is_side = a_ring is side_top and b_ring is brings[0]
            for i in range(n):
                j = (i + 1) % n
                f = [a_ring[i], b_ring[i], b_ring[j], a_ring[j]]
                faces.append(f)
                if is_side and uv == 'planar':
                    za = verts[a_ring[i]][2]; zb = verts[b_ring[i]][2]
                    ui, uj = per[i] / uv_size, per[i + 1] / uv_size
                    c = [(ui, 0.6 + za / uv_size), (ui, 0.6 + zb / uv_size), (uj, 0.6 + zb / uv_size), (uj, 0.6 + za / uv_size)]
                    fuv.append(c)
                else:
                    fuv.append([puv(*verts[v][:2]) for v in f])
        top_rings.append(top_ring); bot_rings.append(bot_ring)

    # caps
    cap_top = fill([[verts[v][:2] for v in r] for r in top_rings])
    cap_bot = fill([[verts[v][:2] for v in r] for r in bot_rings])
    flat_top = [v for r in top_rings for v in r]
    flat_bot = [v for r in bot_rings for v in r]
    for t in cap_top:
        f = [flat_top[i] for i in t]
        faces.append(f); fuv.append([puv(*verts[v][:2]) for v in f])
    for t in cap_bot:
        f = [flat_bot[i] for i in t][::-1]
        faces.append(f); fuv.append([puv(*verts[v][:2]) for v in f])
    return obj_from(name, verts, faces, mat, uvs=fuv, normals=norms, parent=parent)


def lathe(name, profile, mat, seg=32, knurl=None, parent=None, sharp=50):
    """Revolve (r, z) profile around local Z. knurl=(z0, z1, teeth, depth)."""
    verts, faces = [], []
    n = len(profile)
    for s in range(seg):
        a = 2 * math.pi * s / seg
        for r, z in profile:
            rr = r
            if knurl and knurl[0] <= z <= knurl[1] and r > 0:
                rr = r - knurl[3] * (0.5 + 0.5 * math.cos(a * knurl[2]))
            verts.append((rr * math.cos(a), rr * math.sin(a), z))
    for s in range(seg):
        t = (s + 1) % seg
        for i in range(n - 1):
            faces.append([s * n + i, t * n + i, t * n + i + 1, s * n + i + 1])
    return obj_from(name, verts, faces, mat, smooth_angle=sharp, parent=parent, weld=True)


def place(ob, loc, axis=(0, 0, 1), spin=0.0):
    """Point the object's local Z along axis, spin about it, move to loc (inches)."""
    z = Vector(axis).normalized()
    q = Vector((0, 0, 1)).rotation_difference(z)
    ob.matrix_world = Matrix.Translation(Vector(loc) * IN) @ q.to_matrix().to_4x4() @ Matrix.Rotation(spin, 4, 'Z')
    return ob


def tube(name, path, radius, mat, sides=10, parent=None):
    """Tube along a polyline, with parallel-transported frames."""
    P = [Vector(p) for p in path]
    T = []
    for i in range(len(P)):
        a = P[max(i - 1, 0)]; b = P[min(i + 1, len(P) - 1)]
        T.append((b - a).normalized())
    ref = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0))
    Nv = T[0].cross(ref).normalized()
    verts, faces = [], []
    for i, p in enumerate(P):
        if i > 0:
            Nv = (Nv - T[i] * Nv.dot(T[i])).normalized()
        Bv = T[i].cross(Nv)
        for s in range(sides):
            a = 2 * math.pi * s / sides
            v = p + (Nv * math.cos(a) + Bv * math.sin(a)) * radius
            verts.append(tuple(v))
    for i in range(len(P) - 1):
        for s in range(sides):
            t = (s + 1) % sides
            faces.append([i * sides + s, i * sides + t, (i + 1) * sides + t, (i + 1) * sides + s])
    uvs = []
    for f in faces:
        uvs.append([((v // sides) / 4.0, (v % sides) / sides) for v in f])
    return obj_from(name, verts, faces, mat, uvs=uvs, smooth_angle=80, parent=parent)


def rounded_rect(cx, cy, lx, ly, r, n=6, rot=0.0):
    pts = []
    hx, hy = lx / 2 - r, ly / 2 - r
    for (sx, sy, a0) in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append((sx * hx + r * math.cos(a), sy * hy + r * math.sin(a)))
    c, s = math.cos(rot), math.sin(rot)
    return [(cx + x * c - y * s, cy + x * s + y * c) for x, y in pts]


def stadium(cx, cy, length, width, n=16):
    r = width / 2; h = length / 2 - r; pts = []
    for k in range(n + 1):
        a = -math.pi / 2 + math.pi * k / n
        pts.append((cx + h + r * math.cos(a), cy + r * math.sin(a)))
    for k in range(n + 1):
        a = math.pi / 2 + math.pi * k / n
        pts.append((cx - h + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def ellipse(cx, cy, a, b, n=40):
    return [(cx + a * math.cos(2 * math.pi * k / n), cy + b * math.sin(2 * math.pi * k / n)) for k in range(n)]


def transform_obj(ob, M):
    ob.data.transform(M)
    return ob


def catmull(points, per=12, closed=True):
    P = points + (points[:3] if closed else [])
    out = []
    rng = range(len(points)) if closed else range(len(points) - 1)
    for i in rng:
        p0, p1, p2, p3 = (P[(i - 1) % len(points)], P[i % len(points)], P[(i + 1) % len(points)], P[(i + 2) % len(points)]) if closed else (
            P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, len(points) - 1)])
        for k in range(per):
            t = k / per; t2 = t * t; t3 = t2 * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                     + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in range(2)))
    if not closed:
        out.append(points[-1])
    return out



def prism_xz(name, prof, y0, y1, mat):
    """Profile in the XZ plane extruded between y0 and y1."""
    prof = ccw(prof)
    n = len(prof); verts = []; faces = []
    for y in (y0, y1):
        for x, z in prof:
            verts.append((x, y, z))
    faces.append(list(range(n))[::-1] if y0 < y1 else list(range(n)))
    faces.append([n + i for i in range(n)])
    for i in range(n):
        j = (i + 1) % n
        faces.append([i, j, n + j, n + i])
    return obj_from(name, verts, faces, mat, smooth_angle=30, recalc=True)
