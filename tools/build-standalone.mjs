#!/usr/bin/env node
// Folds the page into one classic-script HTML file for Aura (and a double-click): no import statements left
// alive, nothing embedded as a data URL (Aura's import refuses them), and the real assets on the CDN.
//   node tools/build-standalone.mjs                 -> standalone/kveld.html, and the list to host in standalone/hosted/
// What goes where. Inline: all code, the stylesheet, the small JSON files (without the plan trace). On the CDN, from
// Sam1983Aing/aura-assets at the tag below, in the same tree as site/: models, stills, fonts, the Draco decoder.
// A new asset is a push to that repo, a new tag, and a change to the one constant below.
// Aura's connector takes a file's text inside the call, too small for 1.2 MB, so it gets a thin page as well:
//   standalone/aura/index.html is the same page, with the code and the stylesheet on the CDN at the same tag.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, statSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const TAG = '1.24.0';                  // the numeric tag on aura-assets
const CDN = `https://cdn.jsdelivr.net/gh/Sam1983Aing/aura-assets@${TAG}/kveld/`;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), SITE = join(ROOT, 'site'), OUT = join(ROOT, 'standalone');
rmSync(OUT, { recursive: true, force: true }); mkdirSync(join(OUT, 'hosted'), { recursive: true });
const read = (p) => readFileSync(join(SITE, p), 'utf8');
const script = (js) => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`;

// the code: one classic script
const bundled = await build({ entryPoints: [join(SITE, 'src/main.js')], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'inline', logLevel: 'warning',
  alias: { three: join(SITE, 'vendor/three.module.js'), 'three/addons': join(SITE, 'vendor/addons') } });
const code = bundled.outputFiles[0].text;
for (const bad of [/\bimport\s*\(/, /\bimport\.meta\b/, /^\s*(import|export)\s[^=(]/m]) if (bad.test(code)) throw new Error(`module syntax left in the bundle: ${bad}`);

// the stylesheet, its files pointing at the CDN
const hosted = new Set();
const css = (await build({ stdin: { contents: read('styles.css').replace(/url\(["']?((?:vendor|assets)\/[^"')]+)["']?\)/g, (_, p) => { hosted.add(p); return `url("${CDN}${p}")`; }), loader: 'css' }, minify: true, write: false, logLevel: 'warning' })).outputFiles[0].text;

// the small JSON files, inline. plan_outline is traced from licensed sheets (personal use only) and the page never reads it
const data = {};
for (const f of readdirSync(join(SITE, 'assets/data')).filter((f) => f.endsWith('.json'))) {
  const d = JSON.parse(read(`assets/data/${f}`));
  delete d.plan_outline;
  data[`assets/data/${f}`] = d;
}
data['assets/shots/frames.json'] = JSON.parse(read('assets/shots/frames.json'));
if (JSON.stringify(data).includes('plan_outline')) throw new Error('the plan trace is still in the data');

// the page
const src = read('index.html');
const body = src.slice(src.indexOf('<body>') + 6, src.indexOf('</body>')).replace(/<!--[\s\S]*?-->/g, '');
const meta = src.match(/<meta name="description"[^>]*>/)[0];
const vendor = ['gsap.min.js', 'ScrollTrigger.min.js', 'SplitText.min.js', 'lenis.min.js'].map((f) => script(read(`vendor/${f}`)));
hosted.add('assets/icon.svg');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KVELD Showroom</title>
${meta}
<link rel="icon" href="${CDN}assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preload" href="${CDN}vendor/fonts/archivo-var.woff2" as="font" type="font/woff2" crossorigin>
<style>${css}</style>
</head>
<body>${body}
${script(`window.KVELD_ASSETS=${JSON.stringify(CDN)};window.KVELD_DATA=${JSON.stringify(data)};`)}
${vendor.join('\n')}
${script(code)}
</body>
</html>
`;
writeFileSync(join(OUT, 'kveld.html'), html);

// what the file asks the CDN for, and nothing else
for (const f of readdirSync(join(SITE, 'assets/models'))) if (f.endsWith('.glb')) hosted.add(`assets/models/${f}`);
for (const id of ['floe', 'sedge', 'scree', 'moss', 'fjord', 'rowan', 'heath']) { hosted.add(`assets/shots/${id}-hero.webp`); hosted.add(`assets/shots/${id}-front.webp`); }
hosted.add('assets/shots/room-wide.jpg');
for (const f of ['draco_decoder.wasm', 'draco_wasm_wrapper.js', 'LICENSE']) hosted.add(`vendor/draco/${f}`);

// the thin page for Aura. If the CDN doesn't answer, the words of the page still read on a dark ground
const dataJs = `window.KVELD_ASSETS=${JSON.stringify(CDN)};window.KVELD_DATA=${JSON.stringify(data)};`;
const vendorJs = ['gsap.min.js', 'ScrollTrigger.min.js', 'SplitText.min.js', 'lenis.min.js'].map((f) => read(`vendor/${f}`));
mkdirSync(join(OUT, 'hosted/app'), { recursive: true }); mkdirSync(join(OUT, 'aura'), { recursive: true });
writeFileSync(join(OUT, 'hosted/app/kveld.min.js'), [dataJs, ...vendorJs, code].join('\n;'));
writeFileSync(join(OUT, 'hosted/app/kveld.min.css'), css);
const thinBody = body.replace(/\n\s*/g, '\n').replace(/\n+/g, '\n').trim();
const thin = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KVELD Showroom</title>
${meta}
<link rel="icon" href="${CDN}assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preload" href="${CDN}vendor/fonts/archivo-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${CDN}app/kveld.min.js" as="script">
<style>html,body{background:#050708;color:#efeae0}.no-cdn{font-family:system-ui,sans-serif}.no-cdn body{padding:32px;max-width:40em}.no-cdn .loader,.no-cdn svg,.no-cdn canvas,.no-cdn button,.no-cdn .room__fallback{display:none}</style>
<link rel="stylesheet" href="${CDN}app/kveld.min.css">
</head>
<body>
${thinBody}
<script src="${CDN}app/kveld.min.js" onerror="document.documentElement.classList.add('no-cdn')"></script>
</body>
</html>
`;
writeFileSync(join(OUT, 'aura/index.html'), thin);
hosted.add('app/kveld.min.js'); hosted.add('app/kveld.min.css');

let bytes = 0;
const list = [...hosted].sort().map((p) => { const to = join(OUT, 'hosted', p); mkdirSync(dirname(to), { recursive: true }); if (!p.startsWith('app/')) copyFileSync(join(SITE, p), to); const n = statSync(to).size; bytes += n; return { path: p, bytes: n }; });
writeFileSync(join(OUT, 'hosted.json'), JSON.stringify({ tag: TAG, base: CDN, files: list }, null, 1));
writeFileSync('/dev/stdout', `kveld.html ${(html.length / 1024).toFixed(0)} KB (code ${(code.length / 1024).toFixed(0)}, css ${(css.length / 1024).toFixed(0)}, data ${(JSON.stringify(data).length / 1024).toFixed(0)}), aura/index.html ${(thin.length / 1024).toFixed(1)} KB, hosted ${list.length} files ${(bytes / 1048576).toFixed(2)} MB\n`);
