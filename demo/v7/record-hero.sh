#!/bin/sh
# Before/after clips for the V7 hero fix (2026-10-23): the arrows on the halo, the dots gone, the
# name and View guitar under the guitar.
#   sh demo/v7/record-hero.sh before <base-url of v6>      (git archive v6 site, served on its own port)
#   sh demo/v7/record-hero.sh after  [base-url]
# The hero at rest, then next, next, previous, so the ring turns three times.
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-after}; U=${2:-http://localhost:8013/}
READY="window.__room && window.__room.items.length===7 && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader')"
T0=2500
ACT="const at=(t,f)=>setTimeout(f,$T0+t), b=(s)=>document.querySelector(s).click(); at(2200,()=>b('[data-next]')); at(6200,()=>b('[data-next]')); at(10200,()=>b('[data-prev]'));"
node $R --url "$U" --out clips/hero-$L-d.mp4 --size 1380x792 --wait "$READY" --eval "$ACT" --settle $T0 --seconds 14 2>&1 | tail -1
node $R --url "$U" --out clips/hero-$L-p.mp4 --phone --wait "$READY" --eval "$ACT" --settle $T0 --seconds 14 2>&1 | tail -1
