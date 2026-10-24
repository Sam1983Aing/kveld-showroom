#!/bin/sh
# The workshop (V7, 2026-10-23): the tour's last shot, the bench building the guitar, then 02.
#   sh demo/v7/record-shop.sh <label> [base-url]     -> clips/shop-<label>-d.mp4 and -p.mp4
# The three options it was picked from were recorded with ?shop=<slug> on the commit tagged
# alt/workshop-options (clips/shop-now|bench|weeks|gallery-*.mp4, reels shop-options-*.mp4).
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-final}; U=${2:-http://localhost:8013/}
READY="window.__room && window.__room.items.length===7 && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('.spot__names li') && document.querySelector('#workshop')?.dataset.ready"
PLAN="0:#workshop@-1.4; 2:#workshop@-1.4; 4.5:#workshop; 18:#workshop@end; 21:#guitars; 23:#guitars"
node $R --url "$U" --out clips/shop-$L-d.mp4 --size 1380x792 --wait "$READY" --settle 2500 --scroll "$PLAN" 2>&1 | tail -2
node $R --url "$U" --out clips/shop-$L-p.mp4 --phone --wait "$READY" --settle 2500 --scroll "$PLAN" 2>&1 | tail -2
