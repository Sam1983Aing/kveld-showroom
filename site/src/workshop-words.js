// The workshop's words: Big Words with the Log (V7, 2026-10-24). Sam liked both options and asked for
// them together, so the progress reads as steps: "each big word shows the weeks of that step". The
// stage's word stands huge at the top right (REST, CUT, FRET, COAT, PLAY) and fills with light, letter
// by letter, as its weeks go by. On the left, the maker's log for that stage only: one line a week,
// typed out as the week arrives, so you can see where you are inside the step. When the step changes,
// the word and the log change together. (Work Tag, and the three options as they were, are under the
// tag alt/v7-options, behind ?words=.)
//   createStageWords(frame, reduced).update(S, T, info): S the story (stage k, its local progress, the
//   week), T the stages (workshop.js stagesFor), info the guitar.
const { gsap } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const pad = (n) => String(n).padStart(2, '0');

const WOOD = { floe: 'ash', sedge: 'maple and basswood', scree: 'mahogany', moss: 'alder', fjord: 'maple', rowan: 'maple and mahogany', heath: 'alder' };
const kind = (id) => (id === 'sedge' || id === 'rowan' ? 'carved' : id === 'fjord' ? 'semi' : 'solid');

/** The word for each stage, and its log: one line per week, the last line repeating if a stage runs long. */
function copyFor(info) {
  const w = WOOD[info.id], k = kind(info.id);
  return [
    { word: 'REST.', log: [`The ${w} moves in. Onto the rack it goes.`, 'Still on the rack. 45% humidity. Nobody touches it.', 'It has stopped moving. We pretend not to be excited.', 'One more week, for luck.'] },
    { word: k === 'carved' ? 'CARVE.' : k === 'semi' ? 'ARCH.' : 'CUT.',
      log: k === 'carved' ? ['Saw day. The outline first.', 'The top gets carved, one contour line at a time.', 'The neck under the spokeshave. Shavings everywhere.', 'Sanded to 320. It feels like a guitar now.']
        : k === 'semi' ? ['The faces go into the press for their arch.', 'Hollowed out round a solid centre block.', 'Sound holes cut. It breathes now.', 'Sanded to 320. It feels like a guitar now.']
          : ['Saw day. Two millimetres outside the line.', 'Rasp, file, scraper. The body finds its edge.', 'The neck under the spokeshave. Shavings everywhere.', 'Sanded to 320. It feels like a guitar now.'] },
    { word: 'FRET.', log: ['Frets pressed in, one at a time. Levelled, crowned, polished.', 'The thumb test: run it down the edge. Nothing.'] },
    { word: 'COAT.', log: ['First coat. It already looks like something.', 'A coat a day. Sand back. Repeat.', 'It hangs. We wait.', 'Still hanging. Not touching it. Not even a little.', 'Hard enough. Buffed to a shine.', 'One more week on the wall.'] },
    { word: 'PLAY.', log: ['Wired, strung, set up. Played all afternoon, for science.'] },
  ];
}

export function createStageWords(frame, reduced) {
  frame.insertAdjacentHTML('beforeend', `
    <div class="ww__big" aria-hidden="true">
      <p class="ww__meta"><span data-sw-n>01</span><b data-sw-label>The wood</b><i data-sw-when>Weeks 1 to 3</i></p>
      <p class="ww__word"><span data-sw-word></span></p>
    </div>
    <div class="ww__log" aria-live="polite">
      <p class="ww__k">From the bench <span data-sw-k>· weeks 1 to 3</span></p>
      <div class="ww__win"><ol data-sw-log></ol></div>
    </div>`);
  const el = { n: $('[data-sw-n]', frame), label: $('[data-sw-label]', frame), when: $('[data-sw-when]', frame), word: $('[data-sw-word]', frame),
    k: $('[data-sw-k]', frame), log: $('[data-sw-log]', frame), box: $('.ww__log', frame) };
  let at = -1, forId = '', C = null, entries = [];

  const fill = (k, T) => {
    const s = T.stages[k], c = C[k];
    el.n.textContent = s.n; el.label.textContent = s.label; el.when.textContent = s.when;
    el.k.textContent = `· ${s.when.toLowerCase()}`;
    el.word.innerHTML = [...c.word].map((ch) => `<span class="ww__ch">${ch}</span>`).join('');
    // the weeks of this stage, one log line each
    entries = [];
    for (let wk = s.from + 1, i = 0; wk <= s.to; wk++, i++) entries.push({ wk, text: c.log[Math.min(i, c.log.length - 1)] });
    el.log.innerHTML = entries.map((e) => `<li><b>Wk ${pad(e.wk)}</b><span class="ww__t"></span></li>`).join('');
  };

  // the word's light and the log's lines for where the story is (also called right after a step's words
  // change, since the bench may already have stopped drawing by then)
  let lastS = null;
  function render(S) {
    const chs = el.word.children, n = chs.length;
    for (let i = 0; i < n; i++) chs[i].style.setProperty('--fill', `${(clamp01(S.local * n - i) * 100).toFixed(1)}%`);
    const wk = S.week, items = el.log.children;
    const idx = entries.findIndex((e) => e.wk >= Math.max(1, Math.ceil(wk - 1e-6))), cur = idx < 0 ? entries.length - 1 : idx;
    entries.forEach((e, i) => {
      const li = items[i];
      if (!li) return;
      const f = i < cur ? 1 : i > cur ? 0 : reduced ? 1 : clamp01(wk - (e.wk - 1));
      const span = li.lastElementChild, shown = Math.round(e.text.length * f);
      if (span.dataset.shown !== String(shown)) { span.dataset.shown = String(shown); span.textContent = e.text.slice(0, shown); }
      li.classList.toggle('is-on', i === cur);
      li.style.display = i > cur || i < cur - (innerWidth < 900 ? 2 : 4) ? 'none' : '';     // the newest at the bottom, a few at most
    });
  }

  return {
    update(S, T, info) {
      lastS = S;
      if (info.id !== forId) { forId = info.id; C = copyFor(info); at = -1; }
      if (S.k !== at) {
        const first = at < 0; at = S.k;
        if (first || reduced) fill(S.k, T);
        else {
          gsap.timeline({ overwrite: true })
            .to($$('.ww__ch', el.word), { yPercent: -110, duration: 0.3, ease: 'expo.in', stagger: 0.025 })
            .to(el.box, { opacity: 0, y: -10, duration: 0.25, ease: 'expo.in' }, 0)
            .add(() => {
              fill(at, T);
              render(lastS);
              gsap.fromTo($$('.ww__ch', el.word), { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.04 });
              gsap.fromTo(el.box, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', delay: 0.1 });
            });
        }
      }
      render(S);
    },
  };
}
