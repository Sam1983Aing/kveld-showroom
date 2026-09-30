// Plots the Floe plan view from assets/data/floe.json, which the Blender
// build writes from the same numbers it models with. Units are inches; SVG y
// is flipped so the bass side sits on top, as on the original drawing.
const NS = 'http://www.w3.org/2000/svg';

export function drawBlueprint(svg, D) {
  const tail = Math.min(...D.body_outline.map((p) => p[0]));
  const tip = D.nut[0] + D.headstock_length;
  const neckEnd = Math.max(...D.body_outline.map((p) => p[0]));
  const halfW = D.body.width / 2;
  svg.setAttribute('viewBox', `${(tail - 2.6).toFixed(2)} -9.6 ${(tip - tail + 4.2).toFixed(2)} 19.4`);

  const el = (tag, attrs, parent = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };
  const f = (v) => (+v).toFixed(3);
  const path = (pts, close = true) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(-y)}`).join('L') + (close ? 'Z' : '');
  const draw = (tag, attrs, cls, parent) => el(tag, { ...attrs, class: cls, pathLength: 1, 'data-draw': '' }, parent);

  const geo = el('g', { class: 'geo' });
  // centreline first, so everything reads off it
  el('line', { x1: f(tail - 1.6), y1: 0, x2: f(tip + 1.2), y2: 0, class: 'axis', 'data-fade': '' }, geo);

  draw('path', { d: path(D.body_outline) }, 'ink', geo);
  draw('path', { d: path(D.neck) }, 'ink', geo);
  draw('path', { d: path(D.pickguard) }, 'ink-2', geo);
  draw('path', { d: path(D.pickguard_slot) }, 'ink-2', geo);
  draw('path', { d: path(D.bridge_plate) }, 'ink-2', geo);
  draw('path', { d: path(D.bridge_pickup) }, 'ink-2', geo);
  draw('path', { d: path(D.control_plate) }, 'ink-2', geo);
  const [npx, npy] = D.neck_pickup[0];
  draw('rect', { x: f(npx - 0.29), y: f(-npy - 1.29), width: 0.58, height: 2.58, rx: 0.29 }, 'ink-2', geo);
  draw('rect', { x: f(D.nut[0]), y: f(-D.nut[2]), width: f(D.nut[1] - D.nut[0]), height: f(D.nut[2] * 2) }, 'ink-2', geo);
  D.fret_x.forEach((x, i) => {
    const [yl, yr] = D.fret_span[i];
    draw('line', { x1: f(x), y1: f(-yr), x2: f(x), y2: f(-yl) }, 'ink-3', geo);
  });
  D.strings.forEach(([[x0, y0], [x1, y1]]) => draw('line', { x1: f(x0), y1: f(-y0), x2: f(x1), y2: f(-y1) }, 'ink-3', geo));
  D.dots.forEach(([x, y]) => draw('circle', { cx: f(x), cy: f(-y), r: 0.125 }, 'ink-3', geo));
  D.posts.forEach(([x, y]) => draw('circle', { cx: f(x), cy: f(-y), r: 0.17 }, 'ink-2', geo));
  D.knobs.forEach(([x, y]) => draw('circle', { cx: f(x), cy: f(-y), r: 0.37 }, 'ink-3', geo));

  // dimensions, in the accent colour
  const dims = el('g', { class: 'dims' });
  const hdim = (x0, x1, y, label, ext0, ext1) => {
    const g = el('g', {}, dims);
    if (ext0 !== undefined) draw('line', { x1: f(x0), y1: f(-ext0), x2: f(x0), y2: f(-y + (y > 0 ? -0.25 : 0.25)) }, 'dim', g);
    if (ext1 !== undefined) draw('line', { x1: f(x1), y1: f(-ext1), x2: f(x1), y2: f(-y + (y > 0 ? -0.25 : 0.25)) }, 'dim', g);
    draw('line', { x1: f(x0), y1: f(-y), x2: f(x1), y2: f(-y) }, 'dim', g);
    for (const x of [x0, x1]) draw('line', { x1: f(x - 0.12), y1: f(-y + 0.12), x2: f(x + 0.12), y2: f(-y - 0.12) }, 'dim', g);
    const t = el('text', { x: f((x0 + x1) / 2), y: f(-y - 0.22), 'text-anchor': 'middle', class: 'dim-t', 'data-fade': '' }, g);
    t.textContent = label;
  };
  const vdim = (x, y0, y1, label) => {
    const g = el('g', {}, dims);
    draw('line', { x1: f(x), y1: f(-y0), x2: f(x), y2: f(-y1) }, 'dim', g);
    for (const y of [y0, y1]) draw('line', { x1: f(x - 0.12), y1: f(-y + 0.12), x2: f(x + 0.12), y2: f(-y - 0.12) }, 'dim', g);
    const t = el('text', { x: f(x - 0.28), y: f(-(y0 + y1) / 2), 'text-anchor': 'middle', class: 'dim-t', 'data-fade': '',
      transform: `rotate(-90 ${f(x - 0.28)} ${f(-(y0 + y1) / 2)})` }, g);
    t.textContent = label;
  };
  hdim(tail, tip, -9.0, `Overall ${(tip - tail).toFixed(2)}`, -1.0, -1.4);
  hdim(tail, neckEnd, -8.0, `Body ${D.body.length.toFixed(2)}`, -0.6, -1.2);
  hdim(0, D.scale, 7.6, `Scale ${D.scale.toFixed(2)}`, 1.3, 1.0);
  hdim(D.nut[0], tip, 3.6, `Head ${D.headstock_length.toFixed(2)}`);
  vdim(tail - 1.1, -halfW, halfW, `${D.body.width.toFixed(2)}`);

  // a few callouts, the way a luthier annotates a plan
  const notes = el('g', { class: 'notes' });
  const callout = (x, y, tx, ty, text, anchor = 'start') => {
    draw('polyline', { points: `${f(x)},${f(-y)} ${f(tx)},${f(-ty)} ${f(tx + (anchor === 'start' ? 0.5 : -0.5))},${f(-ty)}` }, 'ink-3', notes);
    const t = el('text', { x: f(tx + (anchor === 'start' ? 0.65 : -0.65)), y: f(-ty + 0.11), 'text-anchor': anchor, class: 'lbl', 'data-fade': '' }, notes);
    t.textContent = text;
  };
  callout(7.0, 5.0, 11.4, 5.4, 'Two-piece swamp ash · 1.75 deep');
  callout(-0.08, -0.85, 1.4, -7.0, 'Three brass saddles');
  callout(15.4, 0.4, 14.2, -3.1, `${D.frets} frets · ${D.radius} radius`);
  callout(29.1, -0.72, 27.4, -2.9, `${D.brand} headstock`);
  callout(D.nut[0] + 0.06, 0.7, 23.2, 3.0, `Nut ${D.nut_width.toFixed(2)}`, 'end');

  // title block
  const tb = el('g', { class: 'title-block', 'data-fade': '' });
  const tx = tip - 9.4, ty = 6.1;
  el('rect', { x: f(tx), y: f(ty), width: 8.6, height: 2.1, class: 'ink-3' }, tb);
  el('line', { x1: f(tx), y1: f(ty + 1.0), x2: f(tx + 8.6), y2: f(ty + 1.0), class: 'ink-3' }, tb);
  const t1 = el('text', { x: f(tx + 0.3), y: f(ty + 0.66), class: 'dim-t' }, tb); t1.textContent = `${D.brand} · ${D.model} · Plan`;
  const t2 = el('text', { x: f(tx + 0.3), y: f(ty + 1.66), class: 'lbl' }, tb); t2.textContent = 'Inches · after a 1950s drawing';
  return svg;
}

export function specRows(D) {
  const mm = (v) => Math.round(v * 25.4);
  return [
    ['Scale', `${D.scale.toFixed(2)} in · ${mm(D.scale)} mm`],
    ['Frets', `${D.frets}, vintage wire`],
    ['Radius', `${D.radius} in`],
    ['Nut', `${D.nut_width.toFixed(2)} in`],
    ['Body', `${D.body.length.toFixed(2)} × ${D.body.width.toFixed(2)} × ${D.body.depth.toFixed(2)} in`],
    ['Overall', `${D.overall.toFixed(2)} in`],
    ['Neck', 'One-piece maple, walnut stripe'],
    ['Pickups', 'Two single coils, bridge at 10°'],
    ['Bridge', 'Three brass saddles, strung through'],
  ];
}
