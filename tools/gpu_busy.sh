#!/bin/sh
# How busy the Mac's GPU is, once a second, from its own counter (no admin rights needed).
#   sh tools/gpu_busy.sh [seconds]      default 20
# The Mac idles at about 30%. With the room on screen and moving it was about 90% before the
# performance pass of 2026-10-22 and about 75% after it. That number, not the frame rate, is what
# the fan answers to.
n=${1:-20}; i=0; sum=0
while [ $i -lt $n ]; do
  u=$(ioreg -r -d 1 -w 0 -c IOAccelerator 2>/dev/null | grep -o '"Device Utilization %"=[0-9]*' | head -1 | cut -d= -f2)
  echo "GPU busy ${u}%"; sum=$((sum + u)); i=$((i + 1)); sleep 1
done
echo "average over ${n} s: $((sum / n))%"
