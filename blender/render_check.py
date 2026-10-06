"""Close-up check renders of a built guitar, from named parts.

  blender -b blender/<id>.blend -P blender/render_check.py -- <out_dir> <view> [<view> ...]

A view is  name:part1+part2:dx,dy,dz:dist[:lens]  where the camera looks at the
centre of the named parts' combined box from direction (dx, dy, dz) in the
guitar's upright frame (x across, bass at -x; y up the neck; z out of the top),
`dist` metres away. Same studio as render_views.py. Used to look hard at every
join and corner before a guitar goes on the page.
"""
import math, os, sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    sc.cycles.device = 'GPU'
except Exception:
    pass
sc.cycles.samples = int(os.environ.get('SAMPLES', 64))
sc.cycles.use_denoising = True
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Medium High Contrast'
world = bpy.data.worlds.new('studio'); sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (0.05, 0.05, 0.055, 1); bg.inputs['Strength'].default_value = 1.0


def area(name, loc, target, size, power):
    L = bpy.data.lights.new(name, 'AREA'); L.size = size; L.energy = power
    o = bpy.data.objects.new(name, L); sc.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()


area('key', (-0.9, -1.4, 1.6), (0, 0, 0.45), 1.4, 380)
area('fill', (1.3, -1.0, 0.6), (0, 0, 0.45), 1.2, 140)
area('rim', (0.4, 1.2, 1.4), (0, 0, 0.5), 1.0, 260)
area('top', (0.0, -0.3, 2.2), (0, 0, 0.5), 1.0, 160)

root = next(o for o in bpy.data.objects if o.name.startswith('KVELD_'))
R = root.matrix_world


def box_of(names):
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for n in names:
        o = bpy.data.objects.get(n)
        if not o:
            continue
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    return lo, hi


cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
sc.collection.objects.link(cam); sc.camera = cam
sc.render.resolution_x, sc.render.resolution_y = 1400, 1000
# upright frame -> Blender world: the glTF frame is (x, y up, z front); Blender is (x, -z, y)
to_world = lambda v: Vector((v[0], -v[2], v[1]))
for spec in args[1:]:
    bits = spec.split(':')
    name, parts, d, dist = bits[0], bits[1].split('+'), [float(v) for v in bits[2].split(',')], float(bits[3])
    lens = float(bits[4]) if len(bits) > 4 else 50
    lo, hi = box_of(parts)
    c = (lo + hi) / 2
    if len(bits) > 5:
        # aim inside the box, fractions in the upright frame (x across, y up the neck, z front)
        f = [float(v) for v in bits[5].split(',')]
        fw = (f[0], 1 - f[2], f[1])          # Blender: x, y (front is -y), z
        c = Vector([lo[k] + fw[k] * (hi[k] - lo[k]) for k in range(3)])
    dw = to_world(d).normalized()
    cam.location = c + dw * dist
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Z').to_euler()
    cam_data.lens = lens
    cam_data.clip_start = 0.005
    sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('[check]', sc.render.filepath)
