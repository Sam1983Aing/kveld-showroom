#!/bin/sh
# Before/after clips for V6 step 1: the View guitar sheet (figures out, price and booking in).
#   sh demo/v6/record.sh before|after [base-url]
# Rowan, View guitar, time to read the sheet, then Book a visit (only the after has the button).
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-after}; U=${2:-http://localhost:8013/}
READY="window.__room && window.__room.items.length===7 && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader')"
VIEW="__room.goTo(5); setTimeout(()=>document.querySelector('[data-view]').click(), 4500+1200); setTimeout(()=>document.querySelector('[data-cu-book]')?.click(), 4500+8600);"
node $R --url "$U" --out clips/sheet-$L-d.mp4 --size 1000x575 --wait "$READY" --eval "$VIEW" --settle 4500 --seconds 14 2>&1 | tail -4
node $R --url "$U" --out clips/sheet-$L-p.mp4 --phone --wait "$READY" --eval "$VIEW" --settle 4500 --seconds 14 2>&1 | tail -4
