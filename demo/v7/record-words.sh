#!/bin/sh
# The workshop's words (V7, 2026-10-24): ?words=<slug>, recorded next to the words as they are.
#   sh demo/v7/record-words.sh now | notes | big | log
# From just before the workshop arrives, through its whole pin, to the start of 02.
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-now}; U=${2:-http://localhost:8013/}
[ "$L" = now ] && Q="" || Q="?words=$L"
READY="window.__room && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('#workshop')?.dataset.ready && document.querySelector('.order__step')"
ST="ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.id==='workshop')"
PLAN="0:js:$ST.start-0.15*innerHeight; 1.2:js:$ST.start-0.15*innerHeight; 2.5:js:$ST.start; 17:js:$ST.end; 19:js:$ST.end; 21:#guitars"
node $R --url "$U$Q" --out clips/words-$L-d.mp4 --size 1380x792 --wait "$READY" --settle 3000 --scroll "$PLAN" 2>&1 | tail -1
node $R --url "$U$Q" --out clips/words-$L-p.mp4 --phone --wait "$READY" --settle 3000 --scroll "$PLAN" 2>&1 | tail -1
