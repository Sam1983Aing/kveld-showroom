#!/bin/sh
# The whole page, recorded for QA: forwards, backwards, a hard flick, a resize mid-section, reduced motion, phone.
#   sh demo/qa/record-base.sh <label>      -> demo/qa/<label>/rec-*.mp4 and contact sheets
cd "$(dirname "$0")/../.."
L=${1:-before}; U=${2:-http://localhost:8013/}; O=demo/qa/$L
R=tools/record.mjs
READY="window.__room && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader') && document.querySelector('.slip__line') && document.querySelector('.ftl__info')"
mkdir -p $O
# forwards, at a visitor's pace, holding where a moment lands. All in screens so it fits any window.
RS='js:window.ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.id==="room").start'
PLAN="0:0; 2:0; 12:js:5.5*innerHeight; 26:js:18*innerHeight; 34:js:window.ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.id==='workshop').start; 46:js:window.ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.id==='workshop').end; 50:#guitars; 52:#guitars; 56:js:window.ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.classList.contains('order__pin')).start; 64:js:window.ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.classList.contains('order__pin')).end; 68:js:document.documentElement.scrollHeight-innerHeight; 71:js:document.documentElement.scrollHeight-innerHeight"
node $R --url "$U" --out $O/rec-forward.mp4 --size 1380x792 --wait "$READY" --settle 2500 --scroll "$PLAN" 2>&1 | tail -3
# backwards
BACK="0:js:document.documentElement.scrollHeight-innerHeight; 2:js:document.documentElement.scrollHeight-innerHeight; 10:js:window.ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.classList.contains('order__pin')).start; 14:#guitars; 18:js:window.ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.id==='workshop').end; 28:js:window.ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.id==='workshop').start; 34:js:18*innerHeight; 44:js:5.5*innerHeight; 52:0; 54:0"
node $R --url "$U" --out $O/rec-back.mp4 --size 1380x792 --wait "$READY" --settle 2500 --scroll "$BACK" 2>&1 | tail -3
# a hard flick with a real wheel, over the whole page
node $R --url "$U" --out $O/rec-flick.mp4 --size 1380x792 --wait "$READY" --settle 2500 --wheel 1:13:900:60 2>&1 | tail -3
# phone
PP="0:0; 2:0; 10:js:5.5*innerHeight; 20:js:18*innerHeight; 26:js:window.ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.id==='workshop').start; 36:js:window.ScrollTrigger.getAll().find(s=>s.pin&&s.trigger.id==='workshop').end; 40:#guitars; 42:#guitars; 46:#order; 54:#visit; 58:js:document.documentElement.scrollHeight-innerHeight; 60:js:document.documentElement.scrollHeight-innerHeight"
node $R --url "$U" --out $O/rec-phone.mp4 --phone --wait "$READY" --settle 2500 --scroll "$PP" 2>&1 | tail -3
