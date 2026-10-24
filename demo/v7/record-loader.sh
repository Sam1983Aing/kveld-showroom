#!/bin/sh
# Loader options (V7, 2026-10-24): ?loader=<slug>, next to the loader as it is. The recording keeps the
# page load: it waits until the loader is gone, keeps the 7 seconds before that, then 3 more of the hero.
#   sh demo/v7/record-loader.sh now | strings | ink | halo
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs
L=${1:-now}; U=${2:-http://localhost:8013/}
[ "$L" = now ] && Q="" || Q="?loader=$L"
READY="!document.querySelector('.loader') && window.__room"
node $R --url "$U$Q" --out clips/loader-$L-d.mp4 --size 1380x792 --wait "$READY" --from 7 --settle 0 --seconds 3 2>&1 | tail -1
node $R --url "$U$Q" --out clips/loader-$L-p.mp4 --phone --wait "$READY" --from 7 --settle 0 --seconds 3 2>&1 | tail -1
