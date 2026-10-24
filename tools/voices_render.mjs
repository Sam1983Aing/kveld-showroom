// The seven voices (site/src/voices.js) rendered to WAV files, to listen to outside the page or to put
// under a recorded reel. Needs the site on :8013.
//   node tools/voices_render.mjs [out_dir]      default media/checks/voices/<id>.wav
import { createRequire } from 'module';
import { writeFileSync, mkdirSync } from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const OUT = process.argv[2] || decodeURIComponent(new URL('../media/checks/voices/', import.meta.url).pathname);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage();
await page.goto('http://localhost:8013/vendor/draco/');       // any page on the site, for the module's origin
const res = await page.evaluate(async () => {
  const { createVoices, VOICE_IDS } = await import('/src/voices.js?t=' + Date.now());
  const v = createVoices(), out = {};
  for (const id of VOICE_IDS) {
    const t0 = performance.now();
    const b = await v.render(id);
    const ms = Math.round(performance.now() - t0);
    const n = b.length, L = b.getChannelData(0), R = b.getChannelData(1);
    const pcm = new DataView(new ArrayBuffer(44 + n * 4));
    const w = (o, s) => [...s].forEach((c, i) => pcm.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); pcm.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); pcm.setUint32(16, 16, true); pcm.setUint16(20, 1, true); pcm.setUint16(22, 2, true);
    pcm.setUint32(24, b.sampleRate, true); pcm.setUint32(28, b.sampleRate * 4, true); pcm.setUint16(32, 4, true); pcm.setUint16(34, 16, true); w(36, 'data'); pcm.setUint32(40, n * 4, true);
    let peak = 0, nan = 0, e = 0;
    for (let i = 0; i < n; i++) { for (const [c, d] of [[0, L], [1, R]]) { const x = d[i]; if (!Number.isFinite(x)) nan++; peak = Math.max(peak, Math.abs(x)); e += x * x; pcm.setInt16(44 + i * 4 + c * 2, Math.max(-1, Math.min(1, x || 0)) * 32767, true); } }
    let bin = ''; const u8 = new Uint8Array(pcm.buffer); for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    out[id] = { wav: btoa(bin), seconds: +(n / b.sampleRate).toFixed(2), peak: +peak.toFixed(3), rmsDb: +(10 * Math.log10(e / (2 * n))).toFixed(1), nan, ms };
  }
  return out;
});
for (const [id, r] of Object.entries(res)) {
  writeFileSync(`${OUT}${id}.wav`, Buffer.from(r.wav, 'base64'));
  delete r.wav; console.log(id, JSON.stringify(r));
}
await browser.close();
