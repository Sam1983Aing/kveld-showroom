// Headless Chrome for the capture tools, closed on every way out (chrome-guard.mjs: a normal finish, an
// error, Ctrl+C, a kill, a hang). Playwright talks to it over the debugging port, so the guard holds the
// real process.
//   const { browser, close } = await openChrome({ timeout: 120000, headful: false, audio: false });
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { guardChrome } from './chrome-guard.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export async function openChrome({ timeout = 180000, headful = false, audio = false, port = 9700 + Math.floor(Math.random() * 280) } = {}) {
  const PROFILE = mkdtempSync(join(tmpdir(), 'kveld-chrome-'));
  const flags = [`--remote-debugging-port=${port}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'];
  if (!headful) flags.push('--headless=new');
  if (!audio) flags.push('--mute-audio');
  else flags.push('--autoplay-policy=no-user-gesture-required');
  const chrome = spawn(BIN, [...flags, 'about:blank'], { stdio: 'ignore' });
  const guard = guardChrome(chrome, PROFILE, { timeout });
  let browser = null;
  for (let i = 0; i < 80 && !browser; i++) {
    try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`); } catch { await new Promise((r) => setTimeout(r, 150)); }
  }
  if (!browser) { console.error('Chrome did not open its debugging port'); process.exit(1); }
  return { browser, chromium, close: () => guard.close(), guard };
}

/** Open the page and wait until every part of it is built. */
export async function openKveld(browser, { w = 1725, h = 990, dpr = 1, phone = false, reduced = false, url = 'http://localhost:8013/' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: phone, isMobile: phone, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.problems = [];
  page.on('pageerror', (e) => page.problems.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.problems.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__room?.items?.every((it) => it.ready) && !document.querySelector('.loader') && document.querySelector('.slip__line') && document.querySelector('.ftl__info'), null, { timeout: 150000 });
  await page.waitForTimeout(2000);
  return page;
}

/** Scroll marks in px for each part of the page, read from the live pins. */
export const marks = (page) => page.evaluate(() => {
  const ST = window.ScrollTrigger, vh = innerHeight;
  const pins = ST.getAll().filter((s) => s.pin);
  const room = pins.find((s) => s.trigger.id === 'room'), shop = pins.find((s) => s.trigger.id === 'workshop'), order = pins.find((s) => s.trigger.id === 'order');
  const top = (sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top + scrollY : null; };
  return { vh, max: document.documentElement.scrollHeight - vh, room: room && [room.start, room.end], shop: shop && [shop.start, shop.end], order: order && [order.start, order.end], hear: top('#guitars'), orderTop: top('#order'), visit: top('#visit') };
});

/** Jump to a scroll position and let it settle (the walk and the bench chase the scroll, so snap them). */
export async function goto(page, y, wait = 900) {
  await page.evaluate((y) => { window.__lenis ? window.__lenis.scrollTo(Math.round(y), { immediate: true, force: true }) : window.scrollTo(0, Math.round(y)); }, y);
  await page.waitForTimeout(250);
  await page.evaluate(() => { const r = window.__room; if (r) r.walkAt = r.walkTo; });
  await page.waitForTimeout(wait);
}
