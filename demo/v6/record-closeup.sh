#!/bin/sh
# Before/after clips for the View guitar close-up (V6): body portrait, wider sheet, the seven in the sheet.
#   sh demo/v6/record-closeup.sh before <base-url of this morning's version>
#   sh demo/v6/record-closeup.sh after  [base-url]
# Before: open Floe, back to the room, turn the ring, open the next one (the only way to see another guitar).
# After:  open Floe, pick Rowan in the sheet, next (Heath), back to the room.
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-after}; U=${2:-http://localhost:8013/}
READY="window.__room && window.__room.items.length===7 && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader')"
T0=3000
if [ "$L" = before ]; then
  ACT="const q=s=>document.querySelector(s), at=(t,f)=>setTimeout(f,$T0+t); at(1200,()=>q('[data-view]').click()); at(8200,()=>q('[data-back]').click()); at(10600,()=>q('[data-next]').click()); at(13600,()=>q('[data-view]').click());"
else
  ACT="const q=s=>document.querySelector(s), at=(t,f)=>setTimeout(f,$T0+t); at(1200,()=>q('[data-view]').click()); at(8200,()=>q('[data-cu-names] button[data-i=\"5\"]').click()); at(13000,()=>q('[data-cu-next]').click()); at(17400,()=>q('[data-back]').click());"
fi
node $R --url "$U" --out clips/closeup-$L-d.mp4 --size 1380x792 --wait "$READY" --eval "$ACT" --settle $T0 --seconds 20 2>&1 | tail -1
node $R --url "$U" --out clips/closeup-$L-p.mp4 --phone --wait "$READY" --eval "$ACT" --settle $T0 --seconds 20 2>&1 | tail -1
