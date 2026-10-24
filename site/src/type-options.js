// Font pairings (V7, 2026-10-24, demo-options): ?type=faceplate|stage|amp|gig. Sam found the type "a
// little bit too thin". Round one: Faceplate was his best of three (Luthier and Poster are under the
// tag alt/v7-options), and he asked to see more, so round two puts three new ones next to it. Without
// the switch nothing changes. For the demo the fonts load from Google Fonts and Fontshare (all are free
// to use, so the one Sam picks can be hosted in vendor/fonts like the rest). Applied before the page
// measures its lines.
const SHEETS = {
  faceplate: ['https://fonts.googleapis.com/css2?family=Unbounded:wght@400..700&family=Instrument+Sans:wght@400..600&family=JetBrains+Mono:wght@400..600&display=block'],
  stage: ['https://api.fontshare.com/v2/css?f[]=clash-display@500,600&f[]=satoshi@400,500&display=block', 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400..600&display=block'],
  amp: ['https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=IBM+Plex+Mono:wght@400;500&display=block'],
  gig: ['https://fonts.googleapis.com/css2?family=Syne:wght@600..800&family=Hanken+Grotesk:wght@400..600&family=DM+Mono:wght@400;500&display=block'],
};
// what to wait for before the lines are measured: one string per family, at the weights in use
const FACES = {
  faceplate: ['500 40px Unbounded', '400 14px "Instrument Sans"', '400 11px "JetBrains Mono"'],
  stage: ['600 40px "Clash Display"', '500 14px Satoshi', '400 11px "JetBrains Mono"'],
  amp: ['700 40px Archivo', '400 14px Archivo', '400 11px "IBM Plex Mono"'],
  gig: ['800 40px Syne', '450 14px "Hanken Grotesk"', '400 11px "DM Mono"'],
};

export async function applyType(slug) {
  if (!SHEETS[slug]) return;
  const add = (href) => new Promise((ok) => { const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href }); l.onload = l.onerror = ok; document.head.appendChild(l); });
  await Promise.all([...SHEETS[slug].map(add), add(new URL('../type-options.css', import.meta.url).href + '?v=4')]);
  document.documentElement.dataset.type = slug;
  await Promise.all(FACES[slug].map((f) => document.fonts.load(f))).catch(() => {});
}
