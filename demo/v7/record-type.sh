#!/bin/sh
# Font pairings (V7, 2026-10-24): ?type=<slug>, recorded next to the type as it is.
#   sh demo/v7/record-type.sh now | faceplate | luthier | poster
# A slideshow through the page, three seconds a stop: the hero, a stop of the tour, the workshop, Hear
# them, How to order, the footer.
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-now}; U=${2:-http://localhost:8013/}
[ "$L" = now ] && Q="" || Q="?type=$L"
READY="window.__room && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('.slip__line') && document.querySelector('#workshop')?.dataset.ready && (!location.search.includes('type=') || document.documentElement.dataset.type)"
ACT="const S=1500, at=(t,f)=>setTimeout(f,S+t*1000), to=(y)=>{ window.__lenis.scrollTo(Math.round(y), {immediate:true, force:true}); setTimeout(()=>{ window.__room.walkAt = window.__room.walkTo; }, 60); };
const pin=(id,p)=>{ const st=ScrollTrigger.getAll().find((s)=>s.pin && s.trigger?.id===id); return st.start+(st.end-st.start)*p; }, top=(s)=>document.querySelector(s).getBoundingClientRect().top+scrollY;
at(3, ()=>to(pin('room', 0.42)));
at(6.5, ()=>to(pin('workshop', 0.62)));
at(10, ()=>to(top('#guitars')));
at(13, ()=>to(top('#order')+60));
at(16, ()=>to(top('#visit')));"
node $R --url "$U$Q" --out clips/type-$L-d.mp4 --size 1380x792 --wait "$READY" --eval "$ACT" --settle 1500 --scroll "0:0" --seconds 19 2>&1 | tail -1
node $R --url "$U$Q" --out clips/type-$L-p.mp4 --phone --wait "$READY" --eval "$ACT" --settle 1500 --scroll "0:0" --seconds 19 2>&1 | tail -1
