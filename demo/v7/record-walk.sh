#!/bin/sh
# The close-up tour's words and progress (V7, 2026-10-24): ?walk=<slug>, next to the tour as it is.
#   sh demo/v7/record-walk.sh now | callout | chapter | lens
# From the first stop to the last, about three seconds a stop.
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-now}; U=${2:-http://localhost:8013/}
[ "$L" = now ] && Q="" || Q="?walk=$L"
READY="window.__room && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('#workshop')?.dataset.ready && document.querySelector('.order__step')"
E="ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.id==='room').end"
PLAN="0:js:$E-13.8*innerHeight; 1.5:js:$E-13.8*innerHeight; 21:js:$E-1.7*innerHeight; 22.5:js:$E-1.7*innerHeight"
node $R --url "$U$Q" --out clips/walk-$L-d.mp4 --size 1380x792 --wait "$READY" --settle 3000 --scroll "$PLAN" 2>&1 | tail -1
node $R --url "$U$Q" --out clips/walk-$L-p.mp4 --phone --wait "$READY" --settle 3000 --scroll "$PLAN" 2>&1 | tail -1
