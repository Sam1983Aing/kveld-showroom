#!/bin/sh
# Workshop options (V7, 2026-10-23). The new chapter goes between the end of the close-up tour and 02.
#   sh demo/v7/record-shop.sh now            the page as it is: the tour's last shot, then 02
#   sh demo/v7/record-shop.sh <slug>         ?shop=<slug>: the tour's last shot, the workshop, then 02
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-now}; U=${2:-http://localhost:8013/}
READY="window.__room && window.__room.items.length===7 && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('.spot__names li') && (!document.querySelector('#workshop') || document.querySelector('#workshop').dataset.ready)"
if [ "$L" = now ]; then
  Q=""; PLAN="0:#guitars@-1.4; 2:#guitars@-1.4; 7:#guitars; 10:#guitars"
else
  Q="?shop=$L"; PLAN="0:#workshop@-1.4; 2:#workshop@-1.4; 4.5:#workshop; 18:#workshop@end; 21:#guitars; 23:#guitars"
fi
node $R --url "$U$Q" --out clips/shop-$L-d.mp4 --size 1380x792 --wait "$READY" --settle 2500 --scroll "$PLAN" 2>&1 | tail -2
node $R --url "$U$Q" --out clips/shop-$L-p.mp4 --phone --wait "$READY" --settle 2500 --scroll "$PLAN" 2>&1 | tail -2
