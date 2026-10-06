#!/bin/sh
# Section 02 options: same scroll plan and pace for Now and each option.  sh demo/index/record.sh [base-url]
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs; U=${1:-http://localhost:8013/}
# every model in before the clip starts: a 9 MB GLB being parsed mid-scroll shows up as a stutter
READY="window.__room && window.__room.items.length===7 && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader')"
PLAN="0:#guitars@-0.75; 1.2:#guitars@-0.75; 3.4:#guitars; 4.2:#guitars; 17:#guitars@end; 18.5:#guitars@end"
for m in now wall stage bench; do
  Q=""; [ "$m" != now ] && Q="?index=$m"
  node $R --url "$U$Q" --out clips/$m-d.mp4 --size 1000x575 --wait "$READY" --settle 2500 --scroll "$PLAN" 2>&1 | tail -1
  node $R --url "$U$Q" --out clips/$m-p.mp4 --phone --wait "$READY" --settle 2500 --scroll "$PLAN" 2>&1 | tail -1
done
