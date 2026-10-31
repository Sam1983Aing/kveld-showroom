// What the page's type and interactive states really are, read back from the DOM (not from the stylesheet).
//   node tools/type_audit.mjs [WxH]     prints each family's sizes and trackings, and every button and link
//   with whether it answers to hover and to keyboard focus.
import { openChrome, openKveld } from './chrome.mjs';
const [w, h] = (process.argv[2] || '1725x990').split('x').map(Number);
const { browser, close } = await openChrome({ timeout: 200000 });
const page = await openKveld(browser, { w, h });
const out = await page.evaluate(() => {
  const groups = {};
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
    const c = getComputedStyle(el), fam = c.fontFamily.split(',')[0].replace(/"/g, ''), ls = (parseFloat(c.letterSpacing) || 0) / parseFloat(c.fontSize);
    const key = `${fam} ${c.fontWeight} ${c.fontStretch === '125%' ? 'expanded' : ''}`.trim();
    const cls = (el.className && el.className.baseVal === undefined ? el.className : el.closest('[class]')?.className || el.tagName) + '';
    (groups[key] ||= []).push([+parseFloat(c.fontSize).toFixed(1), +ls.toFixed(2), c.textTransform === 'uppercase' ? 'UP' : '', cls.split(' ')[0]]);
  }
  const sum = {};
  for (const [k, v] of Object.entries(groups)) {
    const m = {};
    v.forEach(([s, l, u, c]) => { const kk = `${s}px ${l}em ${u}`.trim(); (m[kk] ||= new Set()).add(c); });
    sum[k] = Object.entries(m).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([a, b]) => `${a}: ${[...b].slice(0, 7).join(' ')}`);
  }
  const hasRule = (sel, pseudo) => { let hit = false; for (const s of document.styleSheets) { let rules; try { rules = s.cssRules; } catch { continue; } const scan = (rs) => { for (const r of rs) { if (r.cssRules) scan(r.cssRules); if (!r.selectorText || !r.selectorText.includes(pseudo)) continue; for (const part of r.selectorText.split(',')) { if (!part.includes(pseudo)) continue; const base = part.split(pseudo)[0].trim().replace(/::?[a-z-]+(\([^)]*\))?$/, ''); try { if (base && sel.matches(base)) hit = true; } catch {} } } }; scan(rules); } return hit; };
  const inter = [...document.querySelectorAll('a, button')].map((el) => ({ c: (el.className + '').split(' ')[0] || el.parentElement.className || el.tagName, hover: hasRule(el, ':hover'), focus: hasRule(el, ':focus-visible'), tr: getComputedStyle(el).transitionDuration.split(',')[0], href: el.getAttribute('href') || '' }));
  const uniq = {}; inter.forEach((i) => { uniq[i.c] = i; });
  return { sum, inter: uniq };
});
for (const [k, v] of Object.entries(out.sum)) { console.log(`\n${k}`); v.forEach((l) => console.log('  ' + l)); }
console.log('\nbutton or link            hover focus transition  href');
for (const [k, i] of Object.entries(out.inter)) console.log(`${k.padEnd(26)}${i.hover ? 'yes' : ' - '}   ${i.focus ? 'yes' : ' - '}   ${i.tr.padEnd(10)} ${i.href}`);
close(); process.exit(0);
