#!/usr/bin/env python3
"""Re-encode the WebP textures inside a GLB, leaving everything else as it is.
    python3 tools/glb_textures.py in.glb out.glb name=quality [name=quality ...]
Needs ffmpeg and cwebp. Used on floe.glb, whose ash maps were three times the size of any other guitar's."""
import json, struct, subprocess, sys, tempfile, pathlib

src, dst, wants = sys.argv[1], sys.argv[2], dict(a.split('=') for a in sys.argv[3:])
b = pathlib.Path(src).read_bytes()
jl = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + jl])
bin0 = 20 + jl + 8
data = b[bin0:bin0 + struct.unpack('<I', b[20 + jl:24 + jl])[0]]
views = j['bufferViews']
new = {}
for im in j['images']:
    if im.get('name') not in wants:
        continue
    v = views[im['bufferView']]
    raw = data[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    with tempfile.TemporaryDirectory() as t:
        w, p, o = f'{t}/a.webp', f'{t}/a.png', f'{t}/b.webp'
        pathlib.Path(w).write_bytes(raw)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', w, p], check=True)
        subprocess.run(['cwebp', '-quiet', '-m', '6', '-q', wants[im['name']], '-exact', p, '-o', o], check=True)
        new[im['bufferView']] = pathlib.Path(o).read_bytes()
    print(im['name'], len(raw) // 1024, 'KB ->', len(new[im['bufferView']]) // 1024, 'KB')
out = bytearray()
for i, v in enumerate(views):
    chunk = new.get(i) or data[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    while len(out) % 4:
        out.append(0)
    v['byteOffset'] = len(out)
    v['byteLength'] = len(chunk)
    out += chunk
while len(out) % 4:
    out.append(0)
j['buffers'][0]['byteLength'] = len(out)
js = json.dumps(j, separators=(',', ':')).encode()
js += b' ' * (-len(js) % 4)
total = 12 + 8 + len(js) + 8 + len(out)
pathlib.Path(dst).write_bytes(struct.pack('<III', 0x46546C67, 2, total)
    + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out))
print(pathlib.Path(src).stat().st_size // 1024, 'KB ->', pathlib.Path(dst).stat().st_size // 1024, 'KB')
