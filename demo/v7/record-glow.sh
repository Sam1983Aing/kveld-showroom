#!/bin/sh
# The hero's glow and particles (V7, 2026-11-02): ?glow=<slug>, next to the hero as it is.
#   sh demo/v7/record-glow.sh now | fade | embers | corona
# The hero at rest, then next, next, then at rest again.
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-now}; U=${2:-http://localhost:8013/}
[ "$L" = now ] && Q="" || Q="?glow=$L"
READY="window.__room && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('.slip__line')"
T0=2000
ACT="const at=(t,f)=>setTimeout(f,$T0+t), b=(s)=>document.querySelector(s).click(); at(5000,()=>b('[data-next]')); at(10000,()=>b('[data-next]'));"
node $R --url "$U$Q" --out glow/$L-d.mp4 --size 1380x792 --wait "$READY" --eval "$ACT" --settle $T0 --seconds 16 2>&1 | tail -1
node $R --url "$U$Q" --out glow/$L-p.mp4 --phone --wait "$READY" --eval "$ACT" --settle $T0 --seconds 16 2>&1 | tail -1
