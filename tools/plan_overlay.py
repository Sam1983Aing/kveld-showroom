"""Lay the built model over the original 1:1 plan sheet, as an independent check.

  blender -b blender/floe.blend -P tools/plan_overlay.py
  PLAN=reference/strat/Strat-Body-Front.pdf OUT=media/plan-vs-heath.png blender -b blender/heath.blend -P tools/plan_overlay.py

The plan PDF is rasterised at PPI pixels per inch (the sheet is drawn at full
size), the model is rendered straight on with an orthographic camera at the same
PPI, and the two are aligned by cross-correlating the model's body outline with
the plan's ink. Nobody places the model by hand, so if it lands on the drawing,
the drawing is what built it.

Writes media/plan-vs-model.png and prints how far the outline sits from the ink.
"""
import os, subprocess, tempfile

import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PLAN = os.path.join(ROOT, os.environ.get('PLAN', 'reference/telecaster/Fender-Telecaster-Body-Pickgaurd.pdf'))
OUT = os.path.join(ROOT, os.environ.get('OUT', 'media/plan-vs-model.png'))
PPI = 60
IN = 0.0254
TMP = tempfile.mkdtemp()


def load_rgba(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]   # top row first
    bpy.data.images.remove(img)
    return a


def save_rgba(arr, path):
    h, w = arr.shape[:2]
    img = bpy.data.images.new('out', w, h, alpha=True)
    img.pixels[:] = np.ascontiguousarray(arr[::-1]).ravel()
    img.filepath_raw = path; img.file_format = 'PNG'
    img.save()


def dilate(m, r=1):
    o = m.copy()
    for _ in range(r):
        n = o.copy()
        n[1:] |= o[:-1]; n[:-1] |= o[1:]; n[:, 1:] |= o[:, :-1]; n[:, :-1] |= o[:, 1:]
        o = n
    return o


# ------------------------------------------------------------ the plan ----
subprocess.run(['pdftocairo', '-png', '-r', str(PPI), '-singlefile', PLAN, os.path.join(TMP, 'plan')], check=True)
plan = load_rgba(os.path.join(TMP, 'plan.png'))[..., :3]
ink = plan.mean(axis=2) < 0.75

# ----------------------------------------------------------- the model ----
sc = bpy.context.scene
body = bpy.data.objects['Body']
corners = [body.matrix_world @ Vector(c) for c in body.bound_box]
lo = Vector([min(c[i] for c in corners) for i in range(3)])
hi = Vector([max(c[i] for c in corners) for i in range(3)])
mid = (lo + hi) / 2
pad = 1.0 * IN
wx, wz = hi.x - lo.x + 2 * pad, hi.z - lo.z + 2 * pad
rx, rz = round(wx / IN * PPI), round(wz / IN * PPI)

cam_data = bpy.data.cameras.new('plan_cam'); cam_data.type = 'ORTHO'
cam_data.ortho_scale = max(rx, rz) / PPI * IN
cam = bpy.data.objects.new('plan_cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (mid.x, lo.y - 1.0, mid.z)
cam.rotation_euler = (Vector((0, 1, 0))).to_track_quat('-Z', 'Z').to_euler()
sc.render.resolution_x, sc.render.resolution_y = rx, rz
sc.render.resolution_percentage = 100
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'

# 1) the body alone, as a mask
sc.render.engine = 'BLENDER_WORKBENCH'
hidden = [o for o in sc.objects if o.type == 'MESH' and o is not body and not o.hide_render]
for o in hidden: o.hide_render = True
sc.render.filepath = os.path.join(TMP, 'mask.png')
bpy.ops.render.render(write_still=True)
for o in hidden: o.hide_render = False
mask = load_rgba(sc.render.filepath)[..., 3] > 0.5

# 2) the whole guitar, lit, for the picture
sc.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = 'GPU'
except Exception:
    pass
sc.cycles.samples = 64; sc.cycles.use_denoising = True
sc.view_settings.view_transform = 'AgX'
world = bpy.data.worlds.new('plan_world'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.9, 0.9, 0.9, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
key = bpy.data.lights.new('plan_key', 'AREA'); key.size = 1.2; key.energy = 260
ko = bpy.data.objects.new('plan_key', key); sc.collection.objects.link(ko)
ko.location = (mid.x - 0.6, lo.y - 1.2, mid.z + 0.9)
ko.rotation_euler = (Vector(mid) - ko.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = os.path.join(TMP, 'model.png')
bpy.ops.render.render(write_still=True)
model = load_rgba(sc.render.filepath)

# ------------------------------------------------------------ alignment ----
edge = mask & dilate(~mask, 1)        # the outline: body pixels that touch the outside
target = dilate(ink, 2).astype(np.float32)


def best_offset(e):
    H, W = target.shape
    E = np.zeros_like(target); E[:e.shape[0], :e.shape[1]] = e
    corr = np.fft.irfft2(np.fft.rfft2(target) * np.conj(np.fft.rfft2(E)), s=target.shape)
    y, x = np.unravel_index(np.argmax(corr), corr.shape)
    return int(y), int(x), float(corr[y, x] / e.sum())


cands = []
# the sheet may draw the body in any quarter turn, either way round
for rot in range(4):
    for mirror in (False, True):
        e = np.rot90(edge, rot)
        e = e[:, ::-1] if mirror else e
        if e.shape[0] > target.shape[0] or e.shape[1] > target.shape[1]:
            continue
        y, x, s_ = best_offset(e)
        cands.append((s_, rot, mirror, y, x))
score, rot, mirror, oy, ox = max(cands)


def orient(a):
    a = np.rot90(a, rot)
    return a[:, ::-1] if mirror else a


mask, edge, model = orient(mask), orient(edge), orient(model)
h, w = mask.shape

# how far each outline pixel is from the nearest drawn line
ink_crop = ink[oy:oy + h, ox:ox + w]
within = []
reach = ink_crop.copy()
for r in range(0, 7):
    within.append(float((edge & reach).sum() / edge.sum()))
    reach = dilate(reach, 1)
px = 1 / PPI
print(f'[overlay] aligned at ({ox}, {oy}) px, quarter turns {rot}, mirrored={mirror}, match {score:.3f}')
for r, f in enumerate(within):
    print(f'[overlay] outline within {r * px:.3f} in of the ink: {f * 100:.1f}%')

# ----------------------------------------------------------- the picture ----
paper = np.array([0.925, 0.902, 0.855])       # bone, the page's cream
plan_crop = plan[oy:oy + h, ox:ox + w]
plan_img = np.where(ink_crop[..., None], plan_crop * 0.55, paper)

model_img = paper * (1 - model[..., 3:4]) + model[..., :3] * model[..., 3:4]
over = plan_img * (1 - 0.6 * model[..., 3:4]) + model[..., :3] * 0.6 * model[..., 3:4]
red = np.array([0.95, 0.30, 0.20])
over = np.where(dilate(edge, 1)[..., None], red, over)
over = np.where(ink_crop[..., None], np.array([0.10, 0.12, 0.45]), over)   # the drawing's own line on top

gap = np.ones((h, 24, 3)) * paper
sheet = np.concatenate([plan_img, gap, model_img, gap, over], axis=1)
sheet = np.concatenate([sheet, np.ones(sheet.shape[:2] + (1,))], axis=2)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
save_rgba(sheet.astype(np.float32), OUT)
print('[overlay] wrote', OUT)
