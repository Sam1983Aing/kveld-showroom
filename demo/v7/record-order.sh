#!/bin/sh
# 03 · How to order (V7, 2026-10-24): from the end of 02, down the section, into the footer.
#   sh demo/v7/record-order.sh [base-url]     -> clips/order-d.mp4 and -p.mp4
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
U=${1:-http://localhost:8013/}
READY="window.__room && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('.order__step') && document.querySelector('#workshop')?.dataset.ready"
PLAN="0:#order@-0.7; 2:#order@-0.7; 5:#order; 6.5:#order; 12:#order@end; 14:#visit; 16:#visit"
node $R --url "$U" --out clips/order-d.mp4 --size 1380x792 --wait "$READY" --settle 3000 --scroll "$PLAN" 2>&1 | tail -1
PPLAN="0:#order@-0.7; 2:#order@-0.7; 5:#order; 6:#order; 15:#order@end; 17:#visit; 19:#visit"
node $R --url "$U" --out clips/order-p.mp4 --phone --wait "$READY" --settle 3000 --scroll "$PPLAN" 2>&1 | tail -1
