// Font pairings (V7, 2026-10-24, demo-options round): ?type=faceplate|luthier|poster. Sam found the type
// "a little bit too thin" and wanted to explore, creative ones too. Without the switch nothing changes.
// For the demo the fonts come from Google Fonts (all three pairings are open licence, so the one Sam
// picks can be hosted in vendor/fonts like the rest). Applied before the page measures its lines.
const PAIRS = {
  faceplate: ['Unbounded:wght@400..700', 'Instrument+Sans:wght@400..600', 'JetBrains+Mono:wght@400..600'],
  luthier: ['Fraunces:opsz,wght,SOFT,WONK@9..144,400..700,0..100,0..1', 'Inter+Tight:wght@400..600', 'IBM+Plex+Mono:wght@400;500'],
  poster: ['Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800', 'Manrope:wght@400..700', 'Space+Mono:wght@400;700'],
};
// what to wait for before the lines are measured: one string per family, at the weights in use
const FACES = {
  faceplate: ['500 40px Unbounded', '400 14px "Instrument Sans"', '400 11px "JetBrains Mono"'],
  luthier: ['560 40px Fraunces', '400 14px "Inter Tight"', '400 11px "IBM Plex Mono"'],
  poster: ['700 40px "Bricolage Grotesque"', '500 14px Manrope', '400 11px "Space Mono"'],
};

export async function applyType(slug) {
  if (!PAIRS[slug]) return;
  const add = (href) => new Promise((ok) => { const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href }); l.onload = l.onerror = ok; document.head.appendChild(l); });
  await Promise.all([
    add(`https://fonts.googleapis.com/css2?${PAIRS[slug].map((f) => `family=${f}`).join('&')}&display=block`),
    add(new URL('../type-options.css', import.meta.url).href + '?v=2'),
  ]);
  document.documentElement.dataset.type = slug;
  await Promise.all(FACES[slug].map((f) => document.fonts.load(f))).catch(() => {});
}
