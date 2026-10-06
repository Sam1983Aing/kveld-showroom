"""Shared helpers for reading the plan sheets (session 5 onwards).

The Telecaster extraction (extract_tele.py) worked these out first; they are
gathered here so each guitar's extract_<id>.py stays about its own sheet.
Run with Blender's bundled Python (numpy):
  /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 tools/extract_<id>.py

Sheet coordinates are inches, straight off the PDF (one PostScript point is
1/72 in on a 1:1 drawing), y pointing down the page as in the SVG.
"""
import json, math, os, re, struct, sys, zlib

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from parse_plan import segments, chain, PT  # noqa: E402


def strokes(svg_path, scale=PT):
    """Every drawn stroke on the sheet as a polyline, in inches. Honours the
    per-path matrix() transforms pdftocairo writes for some sheets (several
    come out flipped in y without them)."""
    svg = open(svg_path).read()
    out = []
    for tag in re.findall(r'<path\b[^>]*>', svg):
        dm = re.search(r' d="([^"]+)"', tag)
        if not dm:
            continue
        tm = re.search(r'transform="matrix\(([^)]+)\)"', tag)
        a, b, c, d_, e, f = [float(v) for v in re.split(r'[ ,]+', tm.group(1).strip())] if tm else (1, 0, 0, 1, 0, 0)
        for s in segments(dm.group(1)):
            out.append([((a * x + c * y + e) * scale, (b * x + d_ * y + f) * scale) for x, y in s])
    return out


def loops_of(strks, tol=0.6 * PT):
    runs = chain([list(s) for s in strks], tol=tol)
    out = []
    for pts in runs:
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        out.append(dict(pts=pts, closed=math.dist(pts[0], pts[-1]) < 0.02,
                        bbox=(min(xs), min(ys), max(xs), max(ys)),
                        length=sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))))
    return out


def centre(l):
    b = l['bbox']; return ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)


def dia(l):
    b = l['bbox']; return b[2] - b[0]


def circles(loops, d, tol=0.01, within=None):
    """Centres of closed loops that are circles of diameter d."""
    out = []
    for l in loops:
        b = l['bbox']; w, h = b[2] - b[0], b[3] - b[1]
        if l['closed'] and abs(w - d) < tol and abs(h - d) < tol:
            c = centre(l)
            if within is None or (within[0] < c[0] < within[2] and within[1] < c[1] < within[3]):
                if all(math.dist(c, o) > 0.01 for o in out):
                    out.append(c)
    return out


def dilate(m, r):
    o = m.copy()
    for _ in range(r):
        n = o.copy()
        n[1:, :] |= o[:-1, :]; n[:-1, :] |= o[1:, :]
        n[:, 1:] |= o[:, :-1]; n[:, :-1] |= o[:, 1:]
        o = n
    return o


def erode(m, r):
    return ~dilate(~m, r)


def rasterise(strks, box, res):
    x0, y0, x1, y1 = box
    W = int((x1 - x0) / res) + 1; H = int((y1 - y0) / res) + 1
    ink = np.zeros((H, W), bool)
    for s in strks:
        for (ax, ay), (bx, by) in zip(s, s[1:]):
            n = max(2, int(math.dist((ax, ay), (bx, by)) / (res * 0.4)))
            t = np.linspace(0, 1, n)
            px = ((ax + (bx - ax) * t - x0) / res).round().astype(int)
            py = ((ay + (by - ay) * t - y0) / res).round().astype(int)
            ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
            ink[py[ok], px[ok]] = True
    return ink


def silhouette(strks, box, res=0.01, open_r=4):
    """Outer boundary of every stroke inside box, by flood filling the outside."""
    ink = dilate(rasterise(strks, box, res), 1)
    out = np.zeros_like(ink)
    out[0, :] = out[-1, :] = out[:, 0] = out[:, -1] = True
    out &= ~ink
    while True:
        grown = dilate(out, 1) & ~ink
        if grown.sum() == out.sum():
            break
        out = grown
    mask = ~out
    # opening strips the dimension ticks and drill lines that poke outside
    mask = dilate(erode(mask, open_r), open_r)
    return mask


def trace(mask):
    """Moore-neighbour walk around the single blob, returns pixel corners."""
    H, W = mask.shape
    ys, xs = np.nonzero(mask)
    i = np.lexsort((xs, ys))[0]
    start = (int(xs[i]), int(ys[i]))
    nbr = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
    path = [start]; cur = start; back = 4
    while True:
        for k in range(8):
            d = (back + 1 + k) % 8
            nx, ny = cur[0] + nbr[d][0], cur[1] + nbr[d][1]
            if 0 <= nx < W and 0 <= ny < H and mask[ny, nx]:
                back = (d + 4) % 8
                cur = (nx, ny)
                break
        if cur == start:
            break
        path.append(cur)
        if len(path) > 400000:
            raise RuntimeError('trace ran away')
    return path


def snap(pts, strks, reach=0.05):
    """Pull each traced point onto the nearest drawn stroke."""
    cell = 0.05; grid = {}
    for s in strks:
        dense = []
        for (ax, ay), (bx, by) in zip(s, s[1:]):
            n = max(1, int(math.dist((ax, ay), (bx, by)) / 0.004))
            for j in range(n):
                t = j / n; dense.append((ax + (bx - ax) * t, ay + (by - ay) * t))
        dense.append(s[-1])
        for p in dense:
            grid.setdefault((int(p[0] / cell), int(p[1] / cell)), []).append(p)
    out = []
    for p in pts:
        cx, cy = int(p[0] / cell), int(p[1] / cell); best = None; bd = reach
        for gx in (cx - 1, cx, cx + 1):
            for gy in (cy - 1, cy, cy + 1):
                for q in grid.get((gx, gy), ()):
                    d = math.dist(p, q)
                    if d < bd: bd, best = d, q
        out.append(best if best else p)
    return out


def resample(pts, step, closed=True):
    pts = list(pts) + ([pts[0]] if closed else [])
    seg = [math.dist(a, b) for a, b in zip(pts, pts[1:])]
    total = sum(seg); n = max(8, int(total / step)); out = []
    k = 0; acc = 0.0
    for i in range(n + (0 if closed else 1)):
        target = min(total * i / n, total - 1e-9)
        while acc + seg[k] < target:
            acc += seg[k]; k += 1
        t = (target - acc) / seg[k] if seg[k] else 0
        a, b = pts[k], pts[k + 1]
        out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def smooth(pts, r):
    n = len(pts); out = []
    for i in range(n):
        xs = [pts[(i + j) % n][0] for j in range(-r, r + 1)]
        ys = [pts[(i + j) % n][1] for j in range(-r, r + 1)]
        out.append((sum(xs) / len(xs), sum(ys) / len(ys)))
    return out


def outline(strks, box, res=0.01, open_r=4, step=0.04):
    """The closed silhouette of the strokes inside box, snapped back onto the ink."""
    inside = [s for s in strks if any(box[0] < x < box[2] and box[1] < y < box[3] for x, y in s)]
    mask = silhouette(inside, (box[0] - 0.3, box[1] - 0.3, box[2] + 0.3, box[3] + 0.3), res, open_r)
    px = trace(mask)
    raw = [(box[0] - 0.3 + x * res, box[1] - 0.3 + y * res) for x, y in px]
    raw = smooth(resample(raw, 0.02), 2)
    raw = snap(raw, inside)
    raw = smooth(resample(raw, 0.03), 1)
    return resample(raw, step)


def cuts(pts, v, axis):
    """Where a polyline crosses the line axis=v; returns the other coordinate."""
    o = 1 - axis; out = []
    for a, b in zip(pts, pts[1:]):
        if (a[axis] - v) * (b[axis] - v) <= 0 and a[axis] != b[axis]:
            t = (v - a[axis]) / (b[axis] - a[axis]); out.append(a[o] + t * (b[o] - a[o]))
    return sorted(out)


def poly_area(p):
    return 0.5 * sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(p, p[1:] + p[:1]))


# ------------------------------------------------------------- pictures ----
def png_write(path, rgb):
    """rgb: HxWx3 floats 0..1. A plain PNG, no PIL needed."""
    h, w, _ = rgb.shape
    a = (np.clip(rgb, 0, 1) * 255).astype(np.uint8)
    raw = b''.join(b'\x00' + a[y].tobytes() for y in range(h))
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) \
        + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b'')
    open(path, 'wb').write(png)


def plot(path, layers, box, ppi=40):
    """Draw polylines over a white page. layers: [(polylines, (r,g,b), width_px)]."""
    x0, y0, x1, y1 = box
    W = int((x1 - x0) * ppi); H = int((y1 - y0) * ppi)
    img = np.ones((H, W, 3))
    for lines, col, wpx in layers:
        m = rasterise(lines, box, 1 / ppi)[:H, :W]
        if wpx > 1:
            m = dilate(m, wpx - 1)
        img[m] = col
    png_write(path, img)
