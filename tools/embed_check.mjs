// The Aura page inside an iframe, the way an editor's preview might hold it. It runs with an opaque origin and
// no storage at the strict setting, and with its own origin at the loose one.
//   node tools/embed_check.mjs
import { openChrome } from './chrome.mjs';
import { readFileSync } from 'fs';
const page0 = readFileSync('standalone/aura/index.html', 'utf8');
const { browser, close } = await openChrome({ timeout: 200000 });
for (const sandbox of ['allow-scripts', 'allow-scripts allow-same-origin']) {
  const ctx = await browser.newContext({ viewport: { width: 1725, height: 990 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  await page.setContent('<!doctype html><body style="margin:0"><iframe style="width:100vw;height:100vh;border:0"></iframe></body>');
  await page.evaluate(([html, sb]) => { const f = document.querySelector('iframe'); f.setAttribute('sandbox', sb); f.srcdoc = html; }, [page0, sandbox]);
  const t0 = Date.now();
  let frame = null, seen = false;
  while (Date.now() - t0 < 60000 && !seen) {
    frame = page.frames().find((f) => f !== page.mainFrame());
    seen = frame && await frame.evaluate(() => !document.querySelector('.loader') && !!window.__room).catch(() => false);
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(2500);
  const state = seen && await frame.evaluate(() => ({ h1: document.querySelector('.room__h1')?.innerText.replace(/\s+/g, ' '), font: getComputedStyle(document.querySelector('.room__h1')).fontFamily, guitars: window.__room.items.filter((it) => it.ready).length, sections: document.querySelectorAll('.slip__line').length, height: document.documentElement.scrollHeight }));
  console.log(`sandbox="${sandbox}"`, seen ? `in the room ${((Date.now() - t0 - 2500) / 1000).toFixed(1)} s` : 'NEVER OPENED', JSON.stringify(state), '| errors:', errs.join(' | ') || 'none');
  await ctx.close();
}
close(); process.exit(0);
