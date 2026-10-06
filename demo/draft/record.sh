#!/bin/sh
# Re-record the drawing-first options (site served on :8013). Same scroll plan and pace for every clip.
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
PLAN="0:0; 1.5:0; 7:js:2.2*innerHeight; 8.2:js:2.2*innerHeight; 11.5:js:3.5*innerHeight; 12.5:js:3.5*innerHeight; 16.5:js:4.8*innerHeight; 17.5:js:4.8*innerHeight; 20:js:5.5*innerHeight; 24:js:6.5*innerHeight; 25.5:js:6.5*innerHeight"
READY="window.__room && window.__room.items.length===7 && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader')"
U=${2:-http://localhost:8013/}
for m in ${1:-ink stack dark}; do
  W="$READY && window.__draft && window.__draft.data.has('rowan')"
  node $R --url "$U?draft=$m&g=rowan" --out clips/$m-d.mp4 --size 1000x575 --wait "$W" --settle 5000 --scroll "$PLAN" 2>&1 | tail -2
  node $R --url "$U?draft=$m&g=rowan" --out clips/$m-p.mp4 --phone --wait "$W" --settle 5000 --scroll "$PLAN" 2>&1 | tail -2
done
