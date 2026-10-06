#!/bin/sh
# Footer options: same scroll plan for Now and each option.  sh demo/footer/record.sh [base-url]
# The strings get a scripted hand across them and the ticket a scripted pick and stamp, so the clip shows what a visitor would do.
cd "$(dirname "$0")"
R=~/.claude/skills/demo-options/scripts/record.mjs; U=${1:-http://localhost:8013/}
# every model in before the clip starts: a 9 MB GLB being parsed mid-scroll shows up as a stutter
READY="window.__room && window.__room.items.length===7 && window.__room.items.every(it=>it.ready) && !document.querySelector('.loader')"
PLAN="0:#visit@-0.95; 1:#visit@-0.95; 5.5:#visit@end; 12.5:#visit@end"
HAND="const sweep=(t,dir)=>setTimeout(()=>{const n=document.querySelector('.fts__neck');if(!n)return;const r=n.getBoundingClientRect();for(let k=0;k<=24;k++)setTimeout(()=>n.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:r.left+r.width*(0.3+0.25*k/24),clientY:dir>0?r.top+r.height*k/24:r.bottom-r.height*k/24})),k*16)},t);sweep(2500+8200,1);sweep(2500+9800,-1);"
PICK="setTimeout(()=>{const c=document.querySelector('.ftt__card');if(!c)return;c.querySelector('input[value=rowan]').click()},2500+7400);setTimeout(()=>{const c=document.querySelector('.ftt__card');if(!c)return;c.querySelector('input[value=Saturday]').click()},2500+8400);setTimeout(()=>{const c=document.querySelector('.ftt__card');if(c)c.requestSubmit()},2500+9600);"
for m in now light strings ticket; do
  Q=""; [ "$m" != now ] && Q="?footer=$m"
  node $R --url "$U$Q" --out clips/$m-d.mp4 --size 1000x575 --wait "$READY" --eval "$HAND $PICK" --settle 2500 --scroll "$PLAN" 2>&1 | tail -1
  node $R --url "$U$Q" --out clips/$m-p.mp4 --phone --wait "$READY" --eval "$HAND $PICK" --settle 2500 --scroll "$PLAN" 2>&1 | tail -1
done
