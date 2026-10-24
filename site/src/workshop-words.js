// The workshop's words, three options behind ?words=tag|big|log (V7, 2026-10-24, demo-options round).
// Sam: the bench animation is "super nice", the text "feels boring, doesn't match the awesomeness".
// Without the switch the workshop keeps its words as they are (workshop.js).
//   tag   01 Work Tag: a paper tag tied by its string to what is being worked on (the blanks, the saw as
//         it runs, the frets, the wet edge of the finish, the bridge), swinging in at each stage
//   big   02 Big Words: one huge word per stage that fills with light as the stage goes on
//   log   03 The Log: the maker's diary, one entry a week, typed out as you scroll
// update(p, S, at) runs every frame the bench draws: S is the story (stage k, its local progress, the
// week), at(name) the screen point of an anchor on the bench ('blank', 'saw', 'neck', 'sweep', 'bridge').
const { gsap } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const pad = (n) => String(n).padStart(2, '0');

const WOOD = { floe: 'ash', sedge: 'maple and basswood', scree: 'mahogany', moss: 'alder', fjord: 'maple', rowan: 'maple and mahogany', heath: 'alder' };
const kind = (id) => (id === 'sedge' || id === 'rowan' ? 'carved' : id === 'fjord' ? 'semi' : 'solid');

let cssP = null;
const css = () => cssP ||= new Promise((ok) => {
  const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('../workshop-words.css', import.meta.url).href + '?v=1' });
  l.onload = l.onerror = ok; document.head.appendChild(l);
});

export async function buildWords(slug, section, T, info, { reduced }) {
  const make = { tag, big, log }[slug];
  if (!make) return null;
  await css();
  section.classList.add(`ww--${slug}`);
  // a livelier lede for all three
  const lede = $('[data-shop-lede]', section);
  const say = (T) => { if (lede) lede.textContent = `Two makers, one bench, no shortcuts. Here is where the ${T.price} goes.`; };
  say(T);
  const opt = make(section.querySelector('.shop__frame'), T, info, reduced);
  return { update: opt.update, retitle(t, inf) { say(t); opt.retitle?.(t, inf); } };
}

/* ========================================================= 01 · Work Tag === */
const TAG = (T, id) => {
  const w = WOOD[id], k = kind(id);
  return [
    { at: 'blank', line: `The ${w} moves in and sits on the rack for ${T.stages[0].to} weeks. Wood has opinions about the weather.` },
    { at: 'saw', line: k === 'carved' ? 'Sawn to the outline, then the top is carved to the drawing, one contour at a time.' : k === 'semi' ? 'Pressed into its arch, then hollowed out round a solid centre block.' : 'Sawn two millimetres wide of the line. Then a rasp, a scraper and a lot of patience.' },
    { at: 'neck', line: 'Every fret pressed in by hand. The ends rounded, so your thumb never notices them.' },
    { at: 'sweep', line: 'A coat a day, sanded back. Then it hangs and we leave it alone. The hardest part.' },
    { at: 'bridge', line: 'Strings on, action set. Then somebody plays it all afternoon. Purely for testing.' },
  ];
};
function tag(frame, T0, info0, reduced) {
  let T = T0, lines = TAG(T, info0.id);
  frame.insertAdjacentHTML('beforeend', `
    <svg class="ww__string" aria-hidden="true"><path data-string/></svg>
    <div class="ww__tag" data-tag>
      <i class="ww__hole"></i>
      <p class="ww__when"><span data-tag-n>01</span><b data-tag-label>The wood</b><i data-tag-week>Week 01 / 12</i></p>
      <p class="ww__line" data-tag-line></p>
    </div>`);
  const tagEl = $('[data-tag]', frame), str = $('[data-string]', frame);
  const el = { n: $('[data-tag-n]', frame), label: $('[data-tag-label]', frame), week: $('[data-tag-week]', frame), line: $('[data-tag-line]', frame) };
  let at = -1;
  const fill = (k) => { const s = T.stages[k]; el.n.textContent = s.n; el.label.textContent = s.label; el.line.textContent = lines[k].line; };
  return {
    update(p, S, anchor) {
      if (S.k !== at) {
        const first = at < 0; at = S.k; fill(S.k);
        if (!first && !reduced) gsap.fromTo(tagEl, { rotate: -24, y: -26, opacity: 0 }, { rotate: -3, y: 0, opacity: 1, duration: 1.4, ease: 'elastic.out(1, 0.5)', overwrite: true });
      }
      el.week.textContent = `Week ${pad(Math.max(1, Math.ceil(S.week - 1e-6)))} / ${T.weeks}`;
      // the string: from the tag's hole to the point on the bench, sagging a little
      const a = anchor(lines[S.k].at), fr = frame.getBoundingClientRect(), h = $('.ww__hole', tagEl).getBoundingClientRect();
      if (!a) return;
      const x1 = h.left + h.width / 2 - fr.left, y1 = h.top + h.height / 2 - fr.top, [x2, y2] = a;
      const mx = (x1 + x2) / 2, my = Math.max(y1, y2) + Math.abs(x2 - x1) * 0.12;
      str.setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
      const show = p < 0.02 ? (p / 0.02).toFixed(2) : '';
      tagEl.style.opacity = show; str.style.opacity = show;
    },
    retitle(t, inf) { T = t; lines = TAG(T, inf.id); if (at >= 0) fill(at); },
  };
}

/* ======================================================== 02 · Big Words === */
const BIG = (T, id) => {
  const w = WOOD[id], k = kind(id);
  return [
    { word: 'REST.', line: `${T.stages[0].to} weeks of doing nothing. The ${w} insists.` },
    { word: k === 'carved' ? 'CARVE.' : k === 'semi' ? 'ARCH.' : 'CUT.', line: k === 'carved' ? 'Carved to the drawing, one contour line at a time.' : k === 'semi' ? 'Pressed into its arch, hollowed round a centre block.' : 'Two millimetres wide of the line, then by hand.' },
    { word: 'FRET.', line: 'One at a time. No machine, no hurry.' },
    { word: 'COAT.', line: 'A coat a day. Then it hangs, and we wait.' },
    { word: 'PLAY.', line: 'Strung, set up, and played all afternoon. For science.' },
  ];
};
function big(frame, T0, info0, reduced) {
  let T = T0, words = BIG(T, info0.id);
  frame.insertAdjacentHTML('beforeend', `
    <div class="ww__big">
      <p class="ww__meta"><span data-big-n>01</span><b data-big-label>The wood</b><i data-big-when>Weeks 1 to 3</i></p>
      <p class="ww__word" aria-live="polite"><span data-big-word>REST.</span></p>
      <p class="ww__cap" data-big-line></p>
    </div>`);
  const word = $('[data-big-word]', frame), cap = $('[data-big-line]', frame), meta = { n: $('[data-big-n]', frame), label: $('[data-big-label]', frame), when: $('[data-big-when]', frame) };
  let at = -1;
  const fill = (k) => {
    const s = T.stages[k], w = words[k];
    meta.n.textContent = s.n; meta.label.textContent = s.label; meta.when.textContent = s.when;
    word.innerHTML = [...w.word].map((c) => `<span class="ww__ch">${c}</span>`).join('');
    cap.textContent = w.line;
  };
  return {
    update(p, S) {
      if (S.k !== at) {
        const first = at < 0; at = S.k;
        if (first || reduced) fill(S.k);
        else gsap.timeline({ overwrite: true })
          .to($$('.ww__ch', word), { yPercent: -110, duration: 0.3, ease: 'expo.in', stagger: 0.025 })
          .to(cap, { opacity: 0, y: -8, duration: 0.25 }, 0)
          .add(() => {
            fill(at);
            gsap.fromTo($$('.ww__ch', word), { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.04 });
            gsap.fromTo(cap, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', delay: 0.15 });
          });
      }
      // the word fills with light from the left as its stage goes on, letter by letter
      const chs = word.children, n = chs.length;
      for (let i = 0; i < n; i++) chs[i].style.setProperty('--fill', `${(clamp01(S.local * n - i) * 100).toFixed(1)}%`);
    },
    retitle(t, inf) { T = t; words = BIG(T, inf.id); if (at >= 0) fill(at); },
  };
}

/* =========================================================== 03 · The Log === */
const LOG_LINES = (T, id) => {
  const w = WOOD[id], k = kind(id);
  const pools = [
    [`The ${w} moves in. Onto the rack it goes.`, 'Still on the rack. 45% humidity. Nobody touches it.', 'Three weeks of staring at wood. It has stopped moving.', 'It is ready. We pretend not to be excited.', 'One more week, for luck.'],
    k === 'carved' ? ['Saw day. The outline first.', 'The top gets carved, one contour line at a time.', 'Still carving. The arch is nearly there.', 'The neck under the spokeshave. Shavings everywhere.', 'Sanded to 320. It feels like a guitar now.']
      : k === 'semi' ? ['The faces go into the press for their arch.', 'Hollowed out round a solid centre block.', 'Sound holes cut. It breathes now.', 'The neck under the spokeshave.', 'Sanded to 320. It feels like a guitar now.']
        : ['Saw day. Two millimetres outside the line.', 'Rasp, file, scraper. The body finds its edge.', 'The neck under the spokeshave. Shavings everywhere.', 'Sanded to 320. It feels like a guitar now.'],
    ['Frets pressed in, one at a time.', 'Levelled, crowned, polished. The thumb test passes.'],
    ['First coat. It already looks like something.', 'A coat a day. Sand back. Repeat.', 'It hangs. We wait.', 'Still hanging. Not touching it. Not even a little.', 'Hard enough. Buffed to a shine.', 'One more week on the wall.'],
    ['Wired, strung, set up. Played all afternoon, for science.'],
  ];
  const out = [];
  T.stages.forEach((s, k) => { for (let wk = s.from + 1, i = 0; wk <= s.to; wk++, i++) out.push({ wk, k, text: pools[k][Math.min(i, pools[k].length - 1)] }); });
  return out;
};
function log(frame, T0, info0, reduced) {
  let T = T0, entries = [];
  frame.insertAdjacentHTML('beforeend', `
    <div class="ww__log" aria-live="polite">
      <p class="ww__k">From the bench <span>· the maker's log</span></p>
      <div class="ww__win"><ol data-log></ol></div>
    </div>`);
  const list = $('[data-log]', frame);
  const paint = (inf) => {
    entries = LOG_LINES(T, inf.id);
    list.innerHTML = entries.map((e) => `<li data-k="${e.k}"><b>Wk ${pad(e.wk)}</b><span class="ww__t"></span></li>`).join('');
  };
  paint(info0);
  return {
    update(p, S) {
      const items = list.children, wk = S.week;
      // whole weeks typed so far, and how far into the current one
      const target = Math.max(1, Math.ceil(wk - 1e-6));               // the week under way
      let cur = entries.findIndex((e) => e.wk >= target);
      if (cur < 0) cur = entries.length - 1;
      entries.forEach((e, i) => {
        const li = items[i], span = li.lastElementChild;
        const f = i < cur ? 1 : i > cur ? 0 : reduced ? 1 : clamp01(wk - (e.wk - 1));
        const shown = Math.round(e.text.length * f);
        if (span.dataset.shown !== String(shown)) { span.dataset.shown = String(shown); span.textContent = e.text.slice(0, shown); }
        li.classList.toggle('is-on', i === cur);
        li.classList.toggle('is-done', i < cur);
        li.style.display = i > cur || i < cur - 4 ? 'none' : '';       // the newest at the bottom, five at most
      });
    },
    retitle(t, inf) { T = t; paint(inf); },
  };
}
