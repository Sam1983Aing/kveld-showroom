#!/usr/bin/env node
// Record a real-time video of a web page while it scrolls through a section.
// Chrome over the DevTools protocol, no npm dependencies (Node 22+, ffmpeg on PATH).
//
//   node record.mjs --url http://localhost:4310/index.html?footer=ledger --out demo/clips/ledger-d.mp4 \
//     --scroll "0:#footer@-0.6; 1.5:#footer@-0.6; 9:#footer@end; 11:#footer@end"
//
// Run with --help for every option. (The demo-options recorder, with Chrome closed on every way out: chrome-guard.mjs.)
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { guardChrome } from './chrome-guard.mjs';

const HELP = `record.mjs: real-time recording of a page section, resampled to a steady mp4.

Required
  --url URL          page to record (serve it over http, not file://, when it reads images or fonts)
  --out FILE.mp4     where the video goes (folders are created)

Scroll (pick one; without either the page just plays in place)
  --scroll PLAN      keyframes "t:target; t:target; ...", t in seconds after the start.
                     Between keyframes the scroll eases in and out. Repeat a target to hold.
                     target is one of:
                       1200          pixels from the top
                       35%           of the page's scrollable height
                       #sel          element's top at the top of the viewport
                       #sel@-0.5     same, shifted by viewport heights (negative = earlier)
                       #sel@end      element's bottom at the bottom of the viewport
                                     (a GSAP pin-spacer around it counts), @end+0.3 works too
                       js:EXPR       any expression returning pixels
  --wheel T0:T1:DY:MS  real mouse-wheel events instead (DY px every MS ms from T0 to T1 s),
                     to see how the page reacts to a person scrolling (Lenis, gates)
  --scroller SEL     scroll this element instead of the window

Timing
  --seconds N        length after the start (default: last keyframe + 1, or 10)
  --from N           also keep N seconds before the start (a page load, the jump into place)
  --settle MS        wait after jumping to the first keyframe, before the start (default 1500)
  --wait EXPR        extra JS condition to wait for before the jump (a boot flag, say)
  --eval JS          run once the page is ready, before the jump (dismiss a banner, set a flag)

Device
  --size WxH         viewport (default 1440x900)
  --phone            390x844 viewport, touch and an iPhone user agent
                     (true mobile emulation stops screencast frames, so it stays non-mobile)
  --dpr N            device pixel ratio (default 1)
  --headful          a real visible Chrome window instead of headless. Use it to confirm
                     anything with glow, blending or transparent canvases.
  --gl BACKEND       ANGLE backend for headless (default metal on macOS, swiftshader elsewhere)

Output
  --fps N            output frame rate (default 30)
  --crf N            x264 quality (default 18, lower is better)
  --keep             keep the raw frames next to the video (FILE.frames/)
`;

const args = (() => {
  const o = {}, a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) continue;
    const k = a[i].slice(2), v = a[i + 1];
    if (v === undefined || v.startsWith('--')) o[k] = true; else { o[k] = v; i++; }
  }
  return o;
})();
if (args.help || !args.url || !args.out) { console.log(HELP); process.exit(args.help ? 0 : 1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const [VW, VH] = String(args.size || (args.phone ? '390x844' : '1440x900')).split('x').map(Number);
const DPR = Number(args.dpr || 1), FPS = Number(args.fps || 30), OUT = resolve(args.out);
const PLAN = String(args.scroll || '').split(';').map(s => s.trim()).filter(Boolean).map(s => {
  const i = s.indexOf(':');
  if (i < 0) throw new Error(`bad keyframe "${s}", expected t:target`);
  return [Number(s.slice(0, i)), s.slice(i + 1).trim()];
});
const WHEEL = args.wheel ? String(args.wheel).split(':').map(Number) : null;
const SECS = Number(args.seconds || (PLAN.length ? PLAN[PLAN.length - 1][0] + 1 : WHEEL ? WHEEL[1] + 1 : 10));
const FROM = Number(args.from || 0), SETTLE = Number(args.settle ?? 1500);

const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(p => existsSync(p));
if (!CHROME) { console.error('Chrome not found. Set CHROME=/path/to/chrome.'); process.exit(1); }
if (spawnSync('ffmpeg', ['-version']).status !== 0) { console.error('ffmpeg not found on PATH.'); process.exit(1); }

const PORT = 9300 + Math.floor(Math.random() * 600);
const PROFILE = mkdtempSync(join(tmpdir(), 'demo-rec-'));
const flags = [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--mute-audio', `--window-size=${VW},${VH + (args.headful ? 120 : 0)}`,
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
];
if (!args.headful) flags.push('--headless=new', `--use-angle=${args.gl || (platform() === 'darwin' ? 'metal' : 'swiftshader')}`);
const chrome = spawn(CHROME, [...flags, 'about:blank'], { stdio: 'ignore' });
const chromeGuard = guardChrome(chrome, PROFILE, { timeout: (SECS + FROM + 240) * 1000 });
const quit = async code => { chromeGuard.close(); process.exit(code); };

let targets;
for (let i = 0; i < 100; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.find(t => t.type === 'page')) break; } catch {}
  await sleep(150);
}
const tab = targets?.find(t => t.type === 'page');
if (!tab) { console.error('Chrome did not open a debuggable page.'); await quit(1); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));

let id = 0;
const waiting = new Map(), frames = [], problems = [];
const send = (method, params = {}) => new Promise(res => { const my = ++id; waiting.set(my, res); ws.send(JSON.stringify({ id: my, method, params })); });
const evaluate = async (expression, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.error) throw new Error(r.error.message);
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  return r.result?.result?.value;
};
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); return; }
  if (m.method === 'Page.screencastFrame') {
    frames.push({ t: m.params.metadata.timestamp, data: m.params.data });
    send('Page.screencastFrameAck', { sessionId: m.params.sessionId });
  } else if (m.method === 'Runtime.exceptionThrown') {
    problems.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] || m.params.exceptionDetails.text);
  } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    problems.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200));
  }
});

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: DPR, mobile: false });
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
if (args.phone) {
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
}
await send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: VW * DPR, maxHeight: VH * DPR, everyNthFrame: 1 });
const tNav = Date.now() / 1000;
await send('Page.navigate', { url: args.url });

// Ready: loaded, fonts in, and the caller's own condition.
const ready = `document.readyState==='complete' && document.fonts.status==='loaded'` + (args.wait ? ` && !!(${args.wait})` : '');
let ok = false;
for (let i = 0; i < 600 && !ok; i++) { try { ok = await evaluate(ready); } catch {} if (!ok) await sleep(50); }
if (!ok) console.warn('warning: the page never reported ready after 30 s, recording anyway');
if (args.eval) await evaluate(`(async()=>{${args.eval}})()`, true);

// Resolve the keyframes to pixels once, from the top of the page.
const SC = args.scroller ? JSON.stringify(args.scroller) : 'null';
const px = PLAN.length ? await evaluate(`(() => {
  const sc = ${SC} ? document.querySelector(${SC}) : null, H = sc ? sc.clientHeight : innerHeight;
  const cur = sc ? sc.scrollTop : scrollY, max = sc ? sc.scrollHeight - sc.clientHeight : document.documentElement.scrollHeight - H;
  const top = el => el.getBoundingClientRect().top - (sc ? sc.getBoundingClientRect().top : 0) + cur;
  return ${JSON.stringify(PLAN.map(p => p[1]))}.map(s => {
    let y;
    if (s.startsWith('js:')) y = Number((0, eval)(s.slice(3)));
    else if (/^-?\\d+(\\.\\d+)?$/.test(s)) y = Number(s);
    else if (/^\\d+(\\.\\d+)?%$/.test(s)) y = parseFloat(s) / 100 * max;
    else {
      const at = s.lastIndexOf('@'), sel = at > 0 ? s.slice(0, at) : s, k = at > 0 ? s.slice(at + 1) : '0';
      const el = document.querySelector(sel);
      if (!el) throw new Error('no element matches ' + sel);
      if (k.startsWith('end')) { const box = el.closest('.pin-spacer') || el; y = top(box) + box.offsetHeight - H + (Number(k.slice(3)) || 0) * H; }
      else y = top(el) + Number(k) * H;
    }
    return Math.round(Math.min(Math.max(y, 0), max));
  });
})()`).catch(async e => { console.error('scroll plan:', e.message); await quit(1); }) : [];

const setY = `(y => { const sc = ${SC} ? document.querySelector(${SC}) : null; if (sc) sc.scrollTop = y; else window.scrollTo({ top: y, left: 0, behavior: 'instant' }); })`;
if (px.length) await evaluate(`${setY}(${px[0]})`);
await sleep(SETTLE);

// Start: the scroll runs inside the page on requestAnimationFrame so the recorder never stalls it.
const KEYS = PLAN.map((p, k) => [p[0], px[k]]);
const T0 = await evaluate(`(() => {
  const P = ${JSON.stringify(KEYS)}, set = ${setY}, t0 = performance.now();
  const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  if (P.length) (function f(now) {
    const t = (now - t0) / 1000; let v = P[P.length - 1][1];
    for (let k = 0; k < P.length; k++) {
      if (t < P[k][0]) { v = k ? P[k - 1][1] + (P[k][1] - P[k - 1][1]) * ease((t - P[k - 1][0]) / Math.max(.001, P[k][0] - P[k - 1][0])) : P[0][1]; break; }
    }
    set(v);
    if (t < P[P.length - 1][0] + .2) requestAnimationFrame(f);
  })(t0);
  return Date.now() / 1000;
})()`);

if (WHEEL) {
  const [w0, w1, dy, ms] = WHEEL;
  (async () => {
    await sleep(w0 * 1000);
    while (Date.now() / 1000 - T0 < w1) { send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: VW / 2, y: VH / 2, deltaX: 0, deltaY: dy }); await sleep(ms); }
  })();
}

await sleep(SECS * 1000 + 250);
await send('Page.stopScreencast');
await sleep(150);
ws.close();
chromeGuard.close();   // the page work is done: Chrome goes now, not after the encode

if (!frames.length) { console.error('no frames captured (is the page visible and painting?)'); await quit(1); }

// Resample to a steady frame rate: each output frame shows the latest captured one.
mkdirSync(dirname(OUT), { recursive: true });
const DIR = args.keep ? OUT.replace(/\.mp4$/i, '') + '.frames' : mkdtempSync(join(tmpdir(), 'demo-frames-'));
rmSync(DIR, { recursive: true, force: true }); mkdirSync(DIR, { recursive: true });
frames.forEach((f, k) => writeFileSync(join(DIR, `f${String(k).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64')));
let j = 0, list = '';
const tStart = Math.max(T0 - FROM, tNav), n = Math.round((T0 + SECS - tStart) * FPS);
for (let i = 0; i < n; i++) {
  const t = tStart + i / FPS;
  while (j + 1 < frames.length && frames[j + 1].t <= t) j++;
  list += `file 'f${String(j).padStart(5, '0')}.jpg'\nduration ${(1 / FPS).toFixed(6)}\n`;
}
list += `file 'f${String(j).padStart(5, '0')}.jpg'\n`;
writeFileSync(join(DIR, 'list.txt'), list);
const enc = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(DIR, 'list.txt'),
  '-vf', `fps=${FPS},scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p`, '-c:v', 'libx264', '-crf', String(args.crf || 18),
  '-preset', 'medium', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
if (!args.keep) rmSync(DIR, { recursive: true, force: true });
if (enc.status !== 0) { console.error('ffmpeg failed'); await quit(1); }

const after = frames.filter(f => f.t >= T0 && f.t <= T0 + SECS);
const gaps = after.slice(1).map((f, k) => Math.round((f.t - after[k].t) * 1000)).sort((a, b) => b - a);
console.log(`${OUT}`);
console.log(`  ${(n / FPS).toFixed(1)} s at ${FPS} fps, ${VW}x${VH}${args.phone ? ' phone' : ''}${args.headful ? ' headful' : ''}, keyframes at px ${px.join(' ') || '(none)'}`);
console.log(`  captured ${after.length} frames in the recorded span (${(after.length / SECS).toFixed(0)} per second), longest gaps ms: ${gaps.slice(0, 5).join(' ') || '-'}`);
if (problems.length) console.log(`  page errors (${problems.length}): ${[...new Set(problems)].slice(0, 5).join(' | ')}`);
await quit(0);
