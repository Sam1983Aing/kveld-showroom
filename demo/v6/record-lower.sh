#!/bin/sh
# Before/after clips for section 02 and the footer (V6, 2026-10-07).
#   sh demo/v6/record-lower.sh before <base-url of the earlier version>
#   sh demo/v6/record-lower.sh after  [base-url]
# Arrive at section 02, point at three names, scroll on to the footer and stay on it.
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-after}; U=${2:-http://localhost:8013/}
READY="window.__room && window.__room.items.length===7 && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('.spot__names li')"
T0=2500
ACT="const at=(t,f)=>setTimeout(f,$T0+t), over=(i)=>document.querySelectorAll('.spot__names li button')[i].dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'})); at(3400,()=>over(2)); at(5000,()=>over(5)); at(6600,()=>over(1));"
PACT="const at=(t,f)=>setTimeout(f,$T0+t), tap=(i)=>document.querySelectorAll('.spot__dots button')[i].click(); at(3400,()=>tap(2)); at(5000,()=>tap(5)); at(6600,()=>tap(1));"
PLAN="0:#guitars@-0.5; 1.8:#guitars; 8.4:#guitars; 13.4:#visit@end; 20:#visit@end"
node $R --url "$U" --out clips/lower-$L-d.mp4 --size 1380x792 --wait "$READY" --eval "$ACT" --settle $T0 --scroll "$PLAN" 2>&1 | tail -1
node $R --url "$U" --out clips/lower-$L-p.mp4 --phone --wait "$READY" --eval "$PACT" --settle $T0 --scroll "$PLAN" 2>&1 | tail -1
