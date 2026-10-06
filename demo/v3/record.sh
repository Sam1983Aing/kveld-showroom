#!/bin/sh
# Before/after clips for the v3 pass (hero at rest and turning, the View guitar panel).
#   sh demo/v3/record.sh before|after [base-url]
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-after}; U=${2:-http://localhost:8013/}
READY="window.__room && window.__room.items.length===7 && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader')"
# hero: Floe at rest, turn to Sedge, turn to Scree
TURN="setTimeout(()=>__room.step(1), 3000+2600); setTimeout(()=>__room.step(1), 3000+7200);"
node $R --url "$U" --out clips/hero-$L-d.mp4 --size 1000x575 --wait "$READY" --eval "$TURN" --settle 3000 --scroll "0:0; 12:0" 2>&1 | tail -1
node $R --url "$U" --out clips/hero-$L-p.mp4 --phone --wait "$READY" --eval "$TURN" --settle 3000 --scroll "0:0; 12:0" 2>&1 | tail -1
# the panel: Rowan, View guitar, a slow drag's worth of looking, back
VIEW="__room.goTo(5); setTimeout(()=>document.querySelector('[data-view]').click(), 4500+1200);"
node $R --url "$U" --out clips/panel-$L-d.mp4 --size 1000x575 --wait "$READY" --eval "$VIEW" --settle 4500 --scroll "0:0; 9:0" 2>&1 | tail -1
node $R --url "$U" --out clips/panel-$L-p.mp4 --phone --wait "$READY" --eval "$VIEW" --settle 4500 --scroll "0:0; 9:0" 2>&1 | tail -1
