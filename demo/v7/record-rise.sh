#!/bin/sh
# The tour into the workshop (V7, 2026-10-24): from the tour's last stop, past its end, into the bench.
#   sh demo/v7/record-rise.sh <label> [base-url]
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-after}; U=${2:-http://localhost:8013/}
READY="window.__room && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('#workshop')?.dataset.ready && document.querySelector('.order__step')"
E="ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.id==='room').end"
PLAN="0:js:$E-2.3*innerHeight; 1.5:js:$E-2.3*innerHeight; 9:js:$E+0.5*innerHeight; 11:js:$E+0.5*innerHeight"
node $R --url "$U" --out clips/rise-$L-d.mp4 --size 1380x792 --wait "$READY" --settle 3000 --scroll "$PLAN" 2>&1 | tail -1
node $R --url "$U" --out clips/rise-$L-p.mp4 --phone --wait "$READY" --settle 3000 --scroll "$PLAN" 2>&1 | tail -1
