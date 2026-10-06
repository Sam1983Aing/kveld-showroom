"""Pull the drawn outlines out of a plan PDF (via pdftocairo -svg) and chain
them into closed loops, in inches. Usage: parse_plan.py in.svg out.json"""
import json, math, re, sys

PT = 1 / 72.0  # D-size sheets are drawn 1:1, so one PostScript point is 1/72 in

def tokens(d):
    for m in re.finditer(r'[MLCZmlcz]|-?\d*\.?\d+(?:e-?\d+)?', d):
        yield m.group(0)

def cubic(p0, p1, p2, p3, n):
    out = []
    for i in range(1, n + 1):
        t = i / n; u = 1 - t
        out.append((u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
                    u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]))
    return out

def segments(d):
    """Every drawn stroke as a polyline. Sub-paths are kept separate."""
    toks = list(tokens(d)); i = 0; cur = None; start = None; segs = []; poly = None
    def num():
        nonlocal i; v = float(toks[i]); i += 1; return v
    while i < len(toks):
        c = toks[i]; i += 1
        if c == 'M':
            if poly and len(poly) > 1: segs.append(poly)
            cur = (num(), num()); start = cur; poly = [cur]
        elif c == 'L':
            cur = (num(), num()); poly.append(cur)
        elif c == 'C':
            p1 = (num(), num()); p2 = (num(), num()); p3 = (num(), num())
            L = math.dist(cur, p1) + math.dist(p1, p2) + math.dist(p2, p3)
            poly += cubic(cur, p1, p2, p3, max(2, int(L / 1.5))); cur = p3
        elif c == 'Z':
            poly.append(start); cur = start
        else:
            raise ValueError(c)
    if poly and len(poly) > 1: segs.append(poly)
    return segs

def chain(segs, tol):
    """Join strokes whose ends touch into longer runs, then report closure."""
    segs = [list(s) for s in segs]; out = []
    while segs:
        run = segs.pop(); grown = True
        while grown:
            grown = False
            for k, s in enumerate(segs):
                if math.dist(run[-1], s[0]) < tol: run += s[1:]
                elif math.dist(run[-1], s[-1]) < tol: run += s[::-1][1:]
                elif math.dist(run[0], s[-1]) < tol: run = s[:-1] + run
                elif math.dist(run[0], s[0]) < tol: run = s[::-1][:-1] + run
                else: continue
                segs.pop(k); grown = True; break
        out.append(run)
    return out

def main(src, dst):
    svg = open(src).read()
    segs = []
    for d in re.findall(r' d="([^"]+)"', svg):
        segs += segments(d)
    loops = []
    for r in chain(segs, tol=0.6):
        pts = [(x * PT, y * PT) for x, y in r]
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        closed = math.dist(pts[0], pts[-1]) < 0.02
        length = sum(math.dist(pts[j], pts[j+1]) for j in range(len(pts) - 1))
        loops.append(dict(closed=closed, n=len(pts), length=round(length, 3),
                          bbox=[round(min(xs),3), round(min(ys),3), round(max(xs),3), round(max(ys),3)],
                          pts=[[round(x, 4), round(y, 4)] for x, y in pts]))
    loops.sort(key=lambda l: -l['length'])
    json.dump(loops, open(dst, 'w'))
    for k, l in enumerate(loops[:40]):
        b = l['bbox']
        print(f"{k:3d} {'closed' if l['closed'] else 'open  '} len={l['length']:8.3f} "
              f"w={b[2]-b[0]:7.3f} h={b[3]-b[1]:7.3f} at ({b[0]:.2f},{b[1]:.2f})")
    print(len(loops), 'runs total')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
