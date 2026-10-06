#!/bin/sh
# Contact sheet of walk stills: tools/sheet.sh <label>  -> media/checks/<label>-sheet.png
cd "$(dirname "$0")/../media/checks" || exit 1
L=$1
set -- "$L-0.png" "$L-2_5.png" "$L-4_3.png" "$L-6_1.png" "$L-7_9.png" "$L-9_7.png" "$L-11_5.png" "$L-13_3.png"
ffmpeg -loglevel error -y -i "$1" -i "$2" -i "$3" -i "$4" -i "$5" -i "$6" -i "$7" -i "$8" -filter_complex \
"[0]scale=500:-1[a];[1]scale=500:-1[b];[2]scale=500:-1[c];[3]scale=500:-1[d];[4]scale=500:-1[e];[5]scale=500:-1[f];[6]scale=500:-1[g];[7]scale=500:-1[h];[a][b][c][d][e][f][g][h]xstack=inputs=8:layout=0_0|w0_0|0_h0|w0_h0|0_h0+h0|w0_h0+h0|0_h0+h0+h0|w0_h0+h0+h0" "$L-sheet.png"
