#!/bin/sh
# How to order, more interactive versions (V7, 2026-10-24): ?order=<slug>, next to the section as it is.
#   sh demo/v7/record-order-opts.sh now | pairs | deck | ticket
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-now}; U=${2:-http://localhost:8013/}
[ "$L" = now ] && Q="" || Q="?order=$L"
READY="window.__room && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('.order__h2') && document.querySelector('#workshop')?.dataset.ready && (!location.search.includes('order=') || document.querySelector('.oo__stage'))"
PLAN="0:#order@-0.5; 1.5:#order@-0.5; 4:#order; 18:#visit@-1.1; 20:#visit@-1.1"
node $R --url "$U$Q" --out clips/oo-$L-d.mp4 --size 1380x792 --wait "$READY" --settle 3000 --scroll "$PLAN" 2>&1 | tail -1
node $R --url "$U$Q" --out clips/oo-$L-p.mp4 --phone --wait "$READY" --settle 3000 --scroll "$PLAN" 2>&1 | tail -1
