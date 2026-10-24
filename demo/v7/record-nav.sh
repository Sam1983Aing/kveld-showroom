#!/bin/sh
# Navigation options (V7, 2026-10-24): ?nav=<slug>, recorded next to the header as it is.
#   sh demo/v7/record-nav.sh now | halo | fret | index
# The hero, then three trips made from the navigation itself: to the workshop, a little scroll down
# and back up, to How to order (Visit on the old header, it has no such link), then the logo, home.
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-now}; U=${2:-http://localhost:8013/}
[ "$L" = now ] && Q="" || Q="?nav=$L"
READY="window.__room && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('.order__step') && document.querySelector('#workshop')?.dataset.ready && (!location.search.includes('nav=') || document.documentElement.dataset.navReady)"
# clicks are timed from the start of the recording (the eval runs SETTLE ms before it)
ACT="const S=1500, at=(t,f)=>setTimeout(f,S+t*1000), q=(s)=>document.querySelector(s);
const menu=()=>{ const m=q('[data-nav-menu]'); if (m && m.offsetParent) { m.click(); return 2000; } return 0; };
const go=(key, old)=>{ const d=menu(); setTimeout(()=>{ const e=q('[data-nav=\"'+key+'\"]')||q(old); e&&e.click(); }, d); };
at(3, ()=>go('workshop', '.site-nav a[href=\"#guitars\"]'));
at(7.5, ()=>window.__lenis.scrollTo(scrollY+innerHeight*0.6, {duration:1.2}));
at(9.2, ()=>window.__lenis.scrollTo(scrollY-innerHeight*0.4, {duration:1.2}));
at(11, ()=>go('order', '.site-nav a[href=\"#visit\"]'));
at(15.5, ()=>{ const e=q('[data-nav=\"home\"]')||q('.brand'); e&&e.click(); });"
node $R --url "$U$Q" --out clips/nav-$L-d.mp4 --size 1380x792 --wait "$READY" --eval "$ACT" --settle 1500 --scroll "0:0" --seconds 20 2>&1 | tail -1
node $R --url "$U$Q" --out clips/nav-$L-p.mp4 --phone --wait "$READY" --eval "$ACT" --settle 1500 --scroll "0:0" --seconds 20 2>&1 | tail -1
