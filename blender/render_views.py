# Verification renders. exec()'d at the end of build_floe.py with --render.
import math, os
import bpy
from mathutils import Vector

os.makedirs(OUT_RENDER, exist_ok=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    sc.cycles.device = 'GPU'
except Exception as e:
    print('[render] GPU unavailable, CPU instead:', e)
sc.cycles.samples = 96
sc.cycles.use_denoising = True
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Medium High Contrast'

world = bpy.data.worlds.new('studio'); sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (0.018, 0.018, 0.02, 1)
bg.inputs['Strength'].default_value = 1.0


def area(name, loc, target, size, power, color=(1, 1, 1)):
    L = bpy.data.lights.new(name, 'AREA'); L.size = size; L.energy = power; L.color = color
    o = bpy.data.objects.new(name, L); sc.collection.objects.link(o)
    o.location = loc
    d = Vector(target) - Vector(loc)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o


area('key', (-0.9, -1.4, 1.6), (0, 0, 0.45), 1.4, 380)
area('fill', (1.3, -1.0, 0.6), (0, 0, 0.45), 1.2, 120, (1.0, 0.95, 0.9))
area('rim', (0.4, 1.2, 1.4), (0, 0, 0.5), 1.0, 260)
area('top', (0.0, -0.3, 2.2), (0, 0, 0.5), 1.0, 160)

floor = bpy.data.meshes.new('floor')
floor.from_pydata([(-3, -3, -0.012), (3, -3, -0.012), (3, 3, -0.012), (-3, 3, -0.012)], [], [(0, 1, 2, 3)])
fm = bpy.data.materials.new('floor'); fm.use_nodes = True
fp = fm.node_tree.nodes['Principled BSDF']
fp.inputs['Base Color'].default_value = (0.012, 0.012, 0.013, 1); fp.inputs['Roughness'].default_value = 0.35
floor.materials.append(fm)
fo = bpy.data.objects.new('floor', floor); sc.collection.objects.link(fo)

cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
sc.collection.objects.link(cam); sc.camera = cam

VIEWS = [
    ('01_front', (0.0, -3.2, 0.52), (0, 0, 0.49), 70, (1000, 1600)),
    ('02_three_quarter', (1.25, -1.9, 0.95), (0, 0, 0.42), 55, (1600, 1100)),
    ('03_headstock', (-0.22, -0.52, 1.02), (0.0, 0.0, 0.86), 60, (1400, 1100)),
    ('04_bridge', (0.26, -0.34, 0.33), (0.0, -0.02, 0.16), 55, (1600, 1100)),
    ('05_back', (-0.9, 2.6, 0.75), (0, 0, 0.47), 70, (1000, 1600)),
    ('06_controls', (-0.30, -0.36, 0.20), (0.09, -0.02, 0.10), 55, (1600, 1100)),
]
only = os.environ.get('VIEWS')
for name, loc, target, lens, res in VIEWS:
    if only and name not in only.split(','):
        continue
    cam.location = loc
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam_data.lens = lens
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = os.path.join(OUT_RENDER, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('[render]', sc.render.filepath)
