// Stills of the hero's glow options, at rest, for checking: node tools/glow_stills.mjs <out dir> [WxH] [dpr] [slugs]
import { openChrome, openKveld } from './chrome.mjs';
const [out, size = '1725x990', dpr = '1', slugs = 'now,fade,embers,corona'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const { browser, close } = await openChrome({ timeout: 300000 });
for (const slug of slugs.split(',')) {
  const page = await openKveld(browser, { w, h, dpr: +dpr, phone: w < 600, url: `http://localhost:8013/${slug === 'now' ? '' : '?glow=' + slug}` });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/${slug}-${w}.png` });
  console.log(slug, page.problems.join(' | ') || 'no errors');
  await page.context().close();
}
close(); process.exit(0);
