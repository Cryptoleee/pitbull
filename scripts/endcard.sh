#!/bin/bash
# endcard.sh CARD.png SECONDS OUT.mp4 [WxH]  - a still end card as a clip with a fade-in and a silent
# 32 kHz stereo track, so it concatenates cleanly after Minimax H3 segments (1344x768 at 768p 16:9).
set -euo pipefail
FF=$(command -v ffmpeg || python3 -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())")
SIZE=${4:-1344x768}
$FF -y -loglevel error -i "$1" -vf "scale=${SIZE/x/:}:flags=lanczos" -frames:v 1 -update 1 /tmp/_endcard.png
$FF -y -loglevel error -loop 1 -i /tmp/_endcard.png -f lavfi -i anullsrc=r=32000:cl=stereo -t "$2" \
  -vf "fade=t=in:st=0:d=0.3,format=yuv420p" -r 24 -c:v libx264 -crf 18 -c:a aac -b:a 128k -shortest "$3"
