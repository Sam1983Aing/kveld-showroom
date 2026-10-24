#!/bin/sh
# The drawing chapter's words (V7, 2026-10-24): ?ink=<slug>, next to the words as they are.
#   sh demo/v7/record-ink.sh now | block | notes | name
# From the hero's first scroll, through the plan inking and rising, to the start of the tour.
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-now}; U=${2:-http://localhost:8013/}
[ "$L" = now ] && Q="" || Q="?ink=$L"
READY="window.__room && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('#workshop')?.dataset.ready && document.querySelector('.order__step')"
PLAN="0:js:0.2*innerHeight; 1.5:js:0.2*innerHeight; 17:js:5.0*innerHeight; 18.5:js:5.0*innerHeight"
node $R --url "$U$Q" --out clips/ink-$L-d.mp4 --size 1380x792 --wait "$READY" --settle 3000 --scroll "$PLAN" 2>&1 | tail -1
node $R --url "$U$Q" --out clips/ink-$L-p.mp4 --phone --wait "$READY" --settle 3000 --scroll "$PLAN" 2>&1 | tail -1
