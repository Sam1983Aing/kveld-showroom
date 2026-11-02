// Where the page's files are. The site in this folder uses its own copies. The standalone build
// (tools/build-standalone.mjs) sets window.KVELD_ASSETS to the CDN and window.KVELD_DATA to the small JSON files,
// which it carries inline, so the file still says something useful with no network.
const BASE = window.KVELD_ASSETS || '';
export const asset = (path) => BASE + path;
export const json = (path) => (window.KVELD_DATA?.[path]
  ? Promise.resolve(window.KVELD_DATA[path])
  : fetch(asset(path)).then((r) => r.json()));
