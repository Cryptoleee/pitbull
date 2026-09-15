#!/bin/bash
# endcard.sh CARD.png SECONDS OUT.mp4 [WxH]  - a still end card as a clip with a fade-in and a silent
# 32 kHz stereo track, so it concatenates cleanly after Minimax H3 segments (1344x768 at 768p 16:9).
set -euo pipefail
FF=$(python3 -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())")
SIZE=${4:-1344x768}
python3 - "$1" "$SIZE" <<'PY'
import sys; from PIL import Image
w, h = map(int, sys.argv[2].split('x'))
Image.open(sys.argv[1]).convert('RGB').resize((w, h), Image.LANCZOS).save('/tmp/_endcard.png')
PY
$FF -y -loglevel error -loop 1 -i /tmp/_endcard.png -f lavfi -i anullsrc=r=32000:cl=stereo -t "$2" \
  -vf "fade=t=in:st=0:d=0.3,format=yuv420p" -r 24 -c:v libx264 -crf 18 -c:a aac -b:a 128k -shortest "$3"
